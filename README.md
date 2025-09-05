# aigame

## 当前的docker服务

Redis,Mongodb,minio

### 初次启动mongodb的初始化

需要设置data权限

```shell
chmod 755 ./init.sh
sh ./init.sh
```

### 后续正常启动docker compose

```shell
docker compose up -d
```



## Nuxt Web APP

使用`pnpm`进行启动，css采用`tailwind`

为了方便调试统一环境

需要修改host

`sudo nano /etc/hosts`

加入下面的

```
127.0.0.1   mongo
127.0.0.1   redis
127.0.0.1   minio
```

### 初次安装

```shell
cd webapp
pnpm i
pnpm npx generate
cp .env.example .env
```

### 启动测试

```shell
cd webapp
pnpm dev
```

## 备注

### docker mongodb验证用户id的方法

```shell
docker run --rm swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/mongodb/mongodb-community-server:8.0.13-ubuntu2204 id -u mongodb
```