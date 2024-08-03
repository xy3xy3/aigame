from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.deprecation import MiddlewareMixin
import re

class LoginRequiredMiddleware(MiddlewareMixin):
    def process_request(self, request):
        included_path = '/admin/'
        if not request.path_info.startswith(included_path):
            return
        excluded_paths = [
            '/admin/login/',
            '/admin/login/submit/',
            '/',
        ]
        captcha_pattern = re.compile(r'^/captcha/.*')
        if request.path_info in excluded_paths or captcha_pattern.match(request.path_info):
            return
        if not request.session.get("admin_login"):
            return redirect(reverse('admin:login'))
