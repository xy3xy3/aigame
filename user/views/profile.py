from django import forms
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from ..models import Team, User


class EditProfileForm(forms.ModelForm):
    password = forms.CharField(label='密码', required=False, widget=forms.PasswordInput)

    def __init__(self, *args, **kwargs):
        disabled_fields = kwargs.pop('disabled_fields', [])
        super(EditProfileForm, self).__init__(*args, **kwargs)
        for field in disabled_fields:
            if field in self.fields:
                self.fields[field].disabled = True

    class Meta:
        model = User
        fields = ['name', 'student_id', 'avatar', 'password']

    def save(self, commit=True):
        user = super(EditProfileForm, self).save(commit=False)
        password = self.cleaned_data.get('password')
        if password:
            user.set_password(password)
        elif not password and commit:
            # 如果密码为空且需要提交，则从数据库中重新加载用户以避免保存空密码
            user.password = User.objects.get(pk=user.pk).password
        if commit:
            user.save()
        return user

def edit_profile(request):
    user = request.user
    if user.team and user.team.status == Team.TeamStatus.ACTIVE:
        form = EditProfileForm(request.POST, request.FILES, instance=user, disabled_fields=['name', 'student_id'])
    else:
        form = EditProfileForm(request.POST, request.FILES, instance=user)
    if form.is_valid():
        form.save()
        return JsonResponse({'code': 0, 'msg': '个人信息已更新'})
    else:
        errors = form.errors.as_json()
        return JsonResponse({'code': 1, 'msg': errors})
