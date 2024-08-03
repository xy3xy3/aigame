from django.http import JsonResponse
from captcha.models import CaptchaStore
from captcha.helpers import captcha_image_url

def refresh_captcha(request):
    hashkey = CaptchaStore.generate_key()
    image_url = captcha_image_url(hashkey)
    return JsonResponse({'hashkey': hashkey, 'image_url': image_url})
