from django.core.cache import cache
from .models import Config

def get_config(key):
    cache_key = f'config_{key}'
    value = cache.get(cache_key)
    if value is None:
        try:
            config = Config.objects.get(key=key)
            value = config.value
            cache.set(cache_key, value, timeout=3600)  # 缓存1小时
        except Config.DoesNotExist:
            value = None
    return value
