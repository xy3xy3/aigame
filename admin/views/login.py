from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.hashers import check_password, make_password
from admin.models import Config

def login(request):
    if request.method == 'GET':
        return render(request, 'admin/login.html')

    return JsonResponse({'code': 1, 'msg': '方法不允许'})

@require_POST
def submit(request):
    username = request.POST.get('username')
    password = request.POST.get('password')

    admin_user, admin_pwd = Config.get_or_create_default_admin()

    if username == admin_user.value and password == admin_pwd.value:
        request.session['admin_login'] = True
        return JsonResponse({'code': 0, 'msg': '登录成功'})
    else:
        return JsonResponse({'code': 1, 'msg': '用户名或密码错误'})

def logout(request):
    request.session.flush()
    return redirect('admin:login')
