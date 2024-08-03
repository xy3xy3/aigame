from django import forms
from user.models import User, Team
from .base import CustomModelForm

class UserForm(CustomModelForm):
    class Meta:
        model = User
        fields = ['username', 'email', 'name', 'student_id', 'team']

    username = forms.CharField(max_length=16, label='用户名')
    email = forms.EmailField(label='电子邮件地址')
    name = forms.CharField(max_length=255, label='用户全名')
    student_id = forms.CharField(max_length=255, label='学号')
    avatar = forms.ImageField(required=False, label='用户头像')
    team = forms.ModelChoiceField(queryset=Team.objects.all(), required=False, label='所在队伍')  # 将 queryset 改为 Team
