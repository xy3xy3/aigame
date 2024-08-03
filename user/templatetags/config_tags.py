from django import template
from admin.utils import get_config

register = template.Library()

@register.simple_tag
def get_config_value(key):
    return get_config(key)
