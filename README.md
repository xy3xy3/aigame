# 运行方法

需要安装的包
```
conda create --name aigame python=3.11
conda activate aigame
conda install django -y
conda install PyMySQL -y
conda install Pillow -y
set PYTHONPATH=C:\Users\12018\.conda\envs\aigame\Lib\site-packages
pip install --upgrade django-ninja --target=C:\Users\12018\.conda\envs\aigame\Lib\site-packages
pip install --upgrade django-simple-captcha --target=C:\Users\12018\.conda\envs\aigame\Lib\site-packages
```
最下面两个似乎没有在conda里安装

创建数据库
```
python ./manage.py makemigrations
python ./manage.py migrate
```


运行
```
python ./manage.py runserver
```

# 路径说明

```
/admin 管理端，默认账号admin，密码123456
/user 用户端
```


# 其他指令

创建新APP（仅记录指令，不需要执行）
```
python manage.py startapp user
python manage.py startapp admin
django-admin startproject aigame
```

重置密码
```
python manage.py shell
from user.models import User
user = User.objects.get(username='xy3')
user.set_password('123321')
user.save()
quit()
```