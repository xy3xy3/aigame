from django import forms
from ..models import Config
from .base import CustomModelForm
class ConfigForm(CustomModelForm):
    class Meta:
        model = Config
        fields = ['site_title', 'site_description', 'smtp_server', 'smtp_port', 'smtp_email', 'smtp_password']
        widgets = {
            'site_description': forms.Textarea(attrs={'class': 'layui-textarea'}),
        }

    site_title = forms.CharField(max_length=100, label='网站标题')
    site_description = forms.CharField(widget=forms.Textarea, label='网站描述')
    smtp_server = forms.CharField(max_length=100, label='SMTP 服务器')
    smtp_port = forms.IntegerField(label='SMTP 端口号')
    smtp_email = forms.EmailField(label='发件人邮箱')
    smtp_password = forms.CharField(label='邮箱密码')
