from django.shortcuts import render, redirect
from django.http import JsonResponse
from ..models import Config
from ..forms.ConfigForm import ConfigForm
from django.views.decorators.clickjacking import xframe_options_exempt

@xframe_options_exempt
def settings(request):
    if request.method == 'POST':
        form = ConfigForm(request.POST)
        if form.is_valid():
            for key, value in form.cleaned_data.items():
                Config.objects.update_or_create(key=key, defaults={'value': value})
            return JsonResponse({'status': 'success', 'message': 'Settings updated successfully'})
        else:
            return JsonResponse({'status': 'error', 'errors': form.errors})
    else:
        initial_data = {item.key: item.value for item in Config.objects.all()}
        form = ConfigForm(initial=initial_data)
        return render(request, 'admin/settings.html', {'form': form})
