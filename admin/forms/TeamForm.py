from django import forms
from user.models import Team
from .base import CustomModelForm
class TeamForm(CustomModelForm):
    class Meta:
        model = Team
        fields = ['name', 'captain', 'status', 'invite_code']
        widgets = {
            'status': forms.Select(choices=Team.TeamStatus.choices),
        }
