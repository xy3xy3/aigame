import os
import hashlib
import random
import string
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.conf import settings

class Team(models.Model):
    class TeamStatus(models.TextChoices):
        INACTIVE = 'INACTIVE', '未激活'
        PENDING_REVIEW = 'PENDING_REVIEW', '待审核'
        ACTIVE = 'ACTIVE', '已激活'

    name = models.CharField(max_length=255, unique=True, verbose_name="队伍名字")
    avatar = models.ImageField(upload_to='team_avatars/', null=True, blank=True, verbose_name="队伍头像")
    captain = models.OneToOneField('User', on_delete=models.SET_NULL, null=True, related_name='captain_of', verbose_name="队长")
    status = models.CharField(max_length=20, choices=TeamStatus.choices, default=TeamStatus.INACTIVE, verbose_name="队伍状态")
    invite_code = models.CharField(max_length=6, unique=True, blank=True, null=True, verbose_name="邀请码")

    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        super().save(*args, **kwargs)

    def submit_for_review(self):
        if self.status == self.TeamStatus.INACTIVE:
            self.status = self.TeamStatus.PENDING_REVIEW
            self.save()

    def __str__(self):
        return self.name

class UserManager(BaseUserManager):
    def create_user(self, username, email, name, student_id, password=None):
        if not username:
            raise ValueError("用户名必须填写")
        if not email:
            raise ValueError("电子邮件地址必须填写")
        if not name:
            raise ValueError("用户全名必须填写")
        if not student_id:
            raise ValueError("学号必须填写")

        user = self.model(
            username=username,
            email=self.normalize_email(email),
            name=name,
            student_id=student_id,
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, name, student_id, password):
        user = self.create_user(
            username=username,
            email=email,
            name=name,
            student_id=student_id,
            password=password,
        )
        user.is_superuser = True
        user.is_active = True
        user.save(using=self._db)
        return user

    def authenticate(self, username=None, password=None):
        try:
            user = self.get(username=username)
            if user.check_password(password):
                return user
        except self.model.DoesNotExist:
            return None
        return None

class User(AbstractBaseUser):
    username = models.CharField(max_length=16, unique=True, verbose_name="用户名")
    email = models.EmailField(unique=True, verbose_name="电子邮件地址")
    name = models.CharField(max_length=255, verbose_name="用户全名")
    student_id = models.CharField(max_length=255, unique=True, verbose_name="学号")
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name="用户头像")
    team = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name='members', verbose_name="所在队伍")

    is_active = models.BooleanField(default=True, verbose_name="用户是否活跃")
    is_superuser = models.BooleanField(default=False, verbose_name="用户是否是超级用户")

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'name', 'student_id']

    def __str__(self):
        return self.username
    def get_info(self):
        return {
            'username': self.username,
            'email': self.email,
            'name': self.name,
            'student_id': self.student_id,
            'avatar': self.avatar.url if self.avatar else None,
            'team': self.team.name if self.team else None,
        }
    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    def save(self, *args, **kwargs):
        if self.avatar and hasattr(self.avatar, 'name'):
            # 删除旧的文件
            if self.pk:
                old_user = User.objects.get(pk=self.pk)
                if old_user.avatar:
                    old_avatar_path = os.path.join(settings.MEDIA_ROOT, old_user.avatar.name)
                    if os.path.exists(old_avatar_path):
                        os.remove(old_avatar_path)
            # 生成文件名
            file_name = f"{self.id}.{self.username}"
            # 生成md5哈希值
            hash_name = hashlib.md5(file_name.encode()).hexdigest()
            # 获取文件扩展名
            ext = self.avatar.name.split('.')[-1]
            # 生成新的文件名
            self.avatar.name = f"{hash_name}.{ext}"
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'user'