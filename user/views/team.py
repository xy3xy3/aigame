import random
import string
from django.shortcuts import render, redirect
from django.http import JsonResponse
from ..models import Team, User


def team_management(request):
    user = request.user
    team = user.team

    if request.method == "POST":
        action = request.POST.get("action")
        if action == "create":
            if user.team:
                return JsonResponse({'code': 1, 'msg': '你已经在队伍中'})
            team_name = request.POST.get("team_name")
            invite_code = request.POST.get("invite_code") or ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            avatar = request.FILES.get("avatar")
            if team_name and not Team.objects.filter(name=team_name).exists():
                team = Team.objects.create(name=team_name, captain=user, invite_code=invite_code, avatar=avatar)
                user.team = team
                user.save()
                return JsonResponse({'code': 0, 'msg': '队伍创建成功'})
            else:
                return JsonResponse({'code': 1, 'msg': '队伍名称已存在或无效'})

        elif action == "submit_for_review":
            if team and team.captain == user:
                team.submit_for_review()
                return JsonResponse({'code': 0, 'msg': '队伍已提交审核'})
            else:
                return JsonResponse({'code': 1, 'msg': '只有队长才能提交审核'})

        elif action == "join":
            if user.team:
                return JsonResponse({'code': 1, 'msg': '你已经在队伍中'})
            invite_code = request.POST.get("invite_code")
            try:
                team = Team.objects.get(invite_code=invite_code)
                user.team = team
                user.save()
                return JsonResponse({'code': 0, 'msg': '加入队伍成功'})
            except Team.DoesNotExist:
                return JsonResponse({'code': 1, 'msg': '无效的邀请码'})

        elif action == "transfer_captain":
            new_captain_id = request.POST.get("new_captain_id")
            if team and team.captain == user:
                try:
                    new_captain = User.objects.get(id=new_captain_id)
                    team.captain = new_captain
                    team.save()
                    return JsonResponse({'code': 0, 'msg': '队长转让成功'})
                except User.DoesNotExist:
                    return JsonResponse({'code': 1, 'msg': '无效的用户'})
            else:
                return JsonResponse({'code': 1, 'msg': '只有队长才能转让队长职位'})

        elif action == "disband":
            if team and team.captain == user:
                # 修改所有队员的队伍信息
                team.members.update(team=None)
                team.delete()
                user.team = None
                user.save()
                return JsonResponse({'code': 0, 'msg': '队伍已解散'})
            else:
                return JsonResponse({'code': 1, 'msg': '只有队长才能解散队伍'})

        elif action == "leave":
            if team:
                if team.captain == user:
                    return JsonResponse({'code': 1, 'msg': '队长只能解散队伍或者先转让队长职位'})
                user.team = None
                user.save()
                return JsonResponse({'code': 0, 'msg': '已退出队伍'})
            else:
                return JsonResponse({'code': 1, 'msg': '你不在任何队伍中'})

        elif action == "edit_invite_code":
            new_invite_code = request.POST.get("new_invite_code") or ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if team and team.captain == user:
                if not Team.objects.filter(invite_code=new_invite_code).exists():
                    team.invite_code = new_invite_code
                    team.save()
                    return JsonResponse({'code': 0, 'msg': '邀请码已更新', 'invite_code': team.invite_code})
                else:
                    return JsonResponse({'code': 1, 'msg': '邀请码已存在'})
            else:
                return JsonResponse({'code': 1, 'msg': '只有队长才能编辑邀请码'})

        elif action == "edit_team_info":
            if team and team.captain == user:
                team_name = request.POST.get("team_name")
                avatar = request.FILES.get("avatar")
                if team_name:
                    team.name = team_name
                if avatar:
                    team.avatar = avatar
                team.save()
                return JsonResponse({'code': 0, 'msg': '队伍信息已更新'})
            else:
                return JsonResponse({'code': 1, 'msg': '只有队长才能编辑队伍信息'})
        elif action == "remove_member":
            member_id = request.POST.get("member_id")
            if team and team.captain == user:
                try:
                    member = User.objects.get(id=member_id)
                    if member.team == team:
                        member.team = None
                        member.save()
                        return JsonResponse({'code': 0, 'msg': '成员已踢出队伍'})
                    else:
                        return JsonResponse({'code': 1, 'msg': '该成员不在你的队伍中'})
                except User.DoesNotExist:
                    return JsonResponse({'code': 1, 'msg': '无效的用户'})
            else:
                return JsonResponse({'code': 1, 'msg': '只有队长才能踢出成员'})

    return render(request, 'user/team.html', {'team': team})

