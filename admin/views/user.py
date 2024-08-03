from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.http import require_POST
from user.models import User
from admin.forms.UserForm import UserForm
from django.db.models import Q

@xframe_options_exempt
def user(request):
    return render(request, 'admin/user.html')

@xframe_options_exempt
def user_form(request, id=None):
    if request.method == 'POST':
        response = user_save(request)
        return JsonResponse(response)
    else:
        form = UserForm()
    return render(request, 'admin/user_form.html', {'form': form})

def user_list(request):
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 10))
    search_fields = [
        {'name': 'username', 'rule': 'str', 'operator': 'icontains'},
        {'name': 'email', 'rule': 'str', 'operator': 'icontains'},
        {'name': 'name', 'rule': 'str', 'operator': 'icontains'},
        {'name': 'student_id', 'rule': 'str', 'operator': 'icontains'},
    ]

    query = User.objects.all()
    for field in search_fields:
        keyword = request.GET.get(field['name'], '')
        if keyword:
            lookup = f"{field['name']}__{field['operator']}"
            query = query.filter(Q(**{lookup: keyword}))

    total_count = query.count()

    if 'order' in [f.name for f in User._meta.get_fields()]:
        query = query.order_by('-order')
    else:
        query = query.order_by('-id')

    users = query[(page-1)*limit:page*limit]

    user_list = []
    for user in users:
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': user.name,
            'student_id': user.student_id,
            'avatar': user.avatar.url if user.avatar else '',
            'team': user.team.name if user.team else '',
        }
        user_list.append(user_data)

    return JsonResponse({'code': 0, 'msg': "查询成功", 'count': total_count, 'data': user_list})


@require_POST
def user_del(request):
    id = request.POST.get('id')
    user = get_object_or_404(User, id=id)
    user.delete()
    return JsonResponse({'code': 0, 'msg': '删除成功'})

@require_POST
def user_dels(request):
    ids = request.POST.getlist('ids[]')
    User.objects.filter(id__in=ids).delete()
    return JsonResponse({'code': 0, 'msg': '批量删除成功'})

@require_POST
def user_save(request):
    user_id = request.POST.get('id', None)
    if user_id:
        try:
            user = User.objects.get(id=user_id)
            form = UserForm(request.POST, request.FILES, instance=user)
        except User.DoesNotExist:
            return JsonResponse({'code': 1, 'msg': '不存在该用户'})
    else:
        form = UserForm(request.POST, request.FILES)

    if form.is_valid():
        form.save()
        return JsonResponse({'code': 0, 'msg': '保存成功'})
    else:
        return JsonResponse({'code': 1, 'msg': form.errors})
