# aigame

## 当前的docker服务

Redis,Mongodb,minio

### 初次启动mongodb的初始化

需要设置data权限

```shell
mkdir ./data/mongo
sudo chown -R 998:998 ./data/mongo
openssl rand -base64 756 > ./data/mongodb.key
sudo chown 998:998 ./data/mongodb.key
sudo chmod 400 ./data/mongodb.key
docker compose up -d mongo
docker compose logs mongo
docker compose exec mongo mongosh -u root -p password --authenticationDatabase admin --eval 'rs.initiate({ _id: "rs0", members: [ { _id: 0, host: "mongo:27017" } ]})'
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
```

### 启动测试

```shell
cd webapp
pnpm dev
```