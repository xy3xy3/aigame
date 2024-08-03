from django.urls import path
from .views import index, console, settings, team, user, login
app_name='admin'
urlpatterns = [
    path('', index.index, name='index'),
    path('console/', console.console, name='console'),
    path('settings/', settings.settings, name='settings'),
    # 队伍管理
    path('team/', team.team, name='team'),
    path('team/form/', team.team_form, name='team_form'),
    path('team/save/', team.team_save, name='team_save'),
    path('team/list/', team.team_list, name='team_list'),
    path('team/del/', team.team_del, name='team_del'),
    path('team/dels/', team.team_dels, name='team_dels'),
    # 用户管理
    path('user/', user.user, name='user'),
    path('user/form/', user.user_form, name='user_form'),
    path('user/save/', user.user_save, name='user_save'),
    path('user/list/', user.user_list, name='user_list'),
    path('user/del/', user.user_del, name='user_del'),
    path('user/dels/', user.user_dels, name='user_dels'),
    # 登录管理
    path('login/', login.login, name='login'),
    path('login/submit/', login.submit, name='login_submit'),
    path('logout/', login.logout, name='logout'),
]
