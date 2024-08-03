from django.urls import path
from .views import index, console, settings, team
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

]
