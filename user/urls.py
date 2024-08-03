from django.urls import path

from .views import login, index, captcha, team, profile

app_name = 'user'
urlpatterns = [
    path('', index.index, name='index'),
    # 登录注册
    path('login/', login.login_view, name='login'),
    path('logout/', login.logout, name='logout'),
    path('register/', login.reg, name='reg'),
    path('refresh_captcha/', captcha.refresh_captcha, name='refresh_captcha'),
    # 个人中心
    path('edit_profile/', profile.edit_profile, name='edit_profile'),
    # 队伍管理
    path('team/', team.team_management, name='team_management'),
]
