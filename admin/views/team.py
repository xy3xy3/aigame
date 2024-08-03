from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.http import require_POST
from user.models import Team, User
from admin.forms.TeamForm import TeamForm
from django.db.models import Q

@xframe_options_exempt
def team(request):
    return render(request, 'admin/team.html')

@xframe_options_exempt
def team_form(request, id=None):
    if request.method == 'POST':
        response = team_save(request)
        return JsonResponse(response)
    else:
        form = TeamForm()
    return render(request, 'admin/team_form.html', {'form': form})

def team_list(request):
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 10))
    search_fields = [
        {'name': 'name', 'rule': 'str', 'operator': 'icontains'},
        {'name': 'captain', 'rule': 'str', 'operator': 'exact'},  # 将 operator 修改为 exact
        {'name': 'status', 'rule': 'str', 'operator': 'iexact'},
        {'name': 'invite_code', 'rule': 'str', 'operator': 'iexact'},
        {'name': 'start_time', 'rule': 'date', 'operator': 'gte'},
        {'name': 'end_time', 'rule': 'date', 'operator': 'lte'},
    ]

    query = Team.objects.all()
    for field in search_fields:
        keyword = request.GET.get(field['name'], '')
        if keyword:
            if field['name'] == 'start_time' or field['name'] == 'end_time':
                query = query.filter(created_at__gte=keyword) if field['name'] == 'start_time' else query.filter(created_at__lte=keyword)
            elif field['name'] == 'captain':
                query = query.filter(**{f"{field['name']}__username__{field['operator']}": keyword})  # 对 captain 使用 username 字段进行过滤
            else:
                lookup = f"{field['name']}__{field['operator']}"
                query = query.filter(Q(**{lookup: keyword}))

    total_count = query.count()

    if 'order' in [f.name for f in Team._meta.get_fields()]:
        query = query.order_by('-order')
    else:
        query = query.order_by('-id')

    teams = query[(page-1)*limit:page*limit]

    team_list = []
    for team in teams:
        team_data = {
            'id': team.id,
            'name': team.name,
            'avatar': team.avatar.url if team.avatar else '',
            'captain': team.captain.username if team.captain else '',
            'captain_id': team.captain.id if team.captain else '',
            'status': team.status,
            'invite_code': team.invite_code,
        }
        team_list.append(team_data)

    return JsonResponse({'code': 0, 'msg': "查询成功", 'count': total_count, 'data': team_list})


@require_POST
def team_del(request):
    id = request.POST.get('id')
    team = get_object_or_404(Team, id=id)
    team.delete()
    return JsonResponse({'code': 0, 'msg': '删除成功'})

# 批量删除
@require_POST
def team_dels(request):
    ids = request.POST.getlist('ids[]')
    Team.objects.filter(id__in=ids).delete()
    return JsonResponse({'code': 0, 'msg': '批量删除成功'})

@require_POST
def team_save(request):
    team_id = request.POST.get('id', None)
    if team_id:
        try:
            team = Team.objects.get(id=team_id)
            form = TeamForm(request.POST, request.FILES, instance=team)
        except Team.DoesNotExist:
            return JsonResponse({'code': 1, 'msg': '不存在该队伍'})
    else:
        form = TeamForm(request.POST, request.FILES)

    if form.is_valid():
        form.save()
        return JsonResponse({'code': 0, 'msg': '保存成功'})
    else:
        return JsonResponse({'code': 1, 'msg': form.errors})
