from django.db import models

class Config(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()

    def __str__(self):
        return self.key

    @classmethod
    def get_or_create_default_admin(cls):
        admin_user = cls.objects.filter(key='admin_user').first()
        admin_pwd = cls.objects.filter(key='admin_pwd').first()

        if not admin_user:
            admin_user = cls.objects.create(key='admin_user', value='admin')
        if not admin_pwd:
            admin_pwd = cls.objects.create(key='admin_pwd', value='123456')

        return admin_user, admin_pwd
