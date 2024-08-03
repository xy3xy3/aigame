from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from . import views
from django.conf.urls.static import static

urlpatterns = [
    path('', views.index, name='index'),  # 添加这一行
    path('admin/', include('admin.urls', namespace="admin")),
    path('user/', include('user.urls', namespace="user")),
    path('captcha/', include('captcha.urls'),name="captcha_image"),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)