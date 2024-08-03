from django.urls import path

from .views import login, index, captcha, team, profile

app_name = 'user'
urlpatterns = [
    path('', index.index, name='index'),
    path('login/', login.login_view, name='login'),
    path('register/', login.reg, name='reg'),
    path('refresh_captcha/', captcha.refresh_captcha, name='refresh_captcha'),
    path('edit_profile/', profile.edit_profile, name='edit_profile'),
    path('team/', team.team_management, name='team_management'),
]
