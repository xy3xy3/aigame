from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.deprecation import MiddlewareMixin
import re
from .models import User

class LoginRequiredMiddleware(MiddlewareMixin):
    def process_request(self, request):
        incldued_path = '/user/'
        if not request.path_info.startswith(incldued_path):
            return
        excluded_paths = [
            '/user/login/',
            '/user/refresh_captcha/',
            '/user/register/',
            '/',
        ]
        captcha_pattern = re.compile(r'^/captcha/.*')
        if request.path_info in excluded_paths or captcha_pattern.match(request.path_info):
            return
        if not request.session.get("user_id"):
            return redirect(reverse('user:login'))
        try:
            user = User.objects.get(pk=request.session["user_id"])
            request.user = user
        except User.DoesNotExist:
            return redirect(reverse('user:login'))
