# Generated by Django 5.0.7 on 2024-07-16 11:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0005_alter_user_student_id_alter_user_username'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='student_id',
            field=models.CharField(max_length=255, unique=True, verbose_name='学号'),
        ),
    ]
