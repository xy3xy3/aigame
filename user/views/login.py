# user/views/login.py

from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.urls import reverse
from ..models import User  # 引用自定义User模型
from django.core.exceptions import ValidationError
from captcha.models import CaptchaStore
from captcha.helpers import captcha_image_url


def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = User.objects.authenticate(username=username, password=password)
        if user is not None:
            if user.is_active:
                request.session["user_id"] = user.id  # 设置session
                return JsonResponse({"code": 0, "msg": "登录成功"})
            else:
                return JsonResponse({"code": 1, "msg": "用户未激活"})
        else:
            return JsonResponse({"code": 1, "msg": "用户名或密码错误"})
    # 尝试获取用户ID，如果不存在则捕获KeyError异常
    try:
        user_id = request.session["user_id"]
        # 尝试获取用户对象，如果不存在则捕获User.DoesNotExist异常
        if User.objects.filter(pk=user_id).exists():
            return redirect(reverse('user:index'))
    except KeyError:
        # 处理用户ID不存在的情况
        pass
    hashkey = CaptchaStore.generate_key()
    image_url = captcha_image_url(hashkey)
    captcha = {"hashkey": hashkey, "image_url": image_url}
    is_login = True
    return render(request, "user/login.html", locals())


def reg(request):
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        name = request.POST.get("name")
        student_id = request.POST.get("student_id")
        password = request.POST.get("password")
        captcha = request.POST.get("captcha")
        hashkey = request.POST.get("hashkey")
        if not check_captcha(captcha, hashkey):
            return JsonResponse({"code": 1, "msg": "验证码错误"})

        if User.objects.filter(username=username).exists():
            return JsonResponse({"code": 1, "msg": "用户名已存在"})
        if User.objects.filter(email=email).exists():
            return JsonResponse({"code": 1, "msg": "电子邮件已存在"})

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                name=name,
                student_id=student_id,
            )
            user.name = name
            user.student_id = student_id
            user.save()
            request.session["user_id"] = user.id  # 设置session
            return JsonResponse({"code": 0, "msg": "注册成功"})
        except ValidationError as e:
            return JsonResponse({"code": 1, "msg": str(e)})

    # 尝试获取用户ID，如果不存在则捕获KeyError异常
    try:
        user_id = request.session["user_id"]
        # 尝试获取用户对象，如果不存在则捕获User.DoesNotExist异常
        if User.objects.filter(pk=user_id).exists():
            return redirect(reverse('user:index'))
    except KeyError:
        # 处理用户ID不存在的情况
        pass
    hashkey = CaptchaStore.generate_key()
    image_url = captcha_image_url(hashkey)
    captcha = {"hashkey": hashkey, "image_url": image_url}
    is_login = False
    return render(request, "user/login.html", locals())


def logout(request):
    request.session.pop('user_id', None)
    return redirect('user:login')
def check_captcha(captcha, hashkey):
    try:
        captcha_obj = CaptchaStore.objects.get(hashkey=hashkey)
        if captcha_obj.response.lower() == captcha.lower():
            return True
    except CaptchaStore.DoesNotExist:
        return False
    return False
