# aigame

## 当前的docker服务

Redis,Mongodb,minio

```
mkdir ./data/mongo
sudo chown -R 998:998 ./data/mongo
openssl rand -base64 756 > ./data/mongodb.key
sudo chown 998:998 ./data/mongodb.key
sudo chmod 400 ./data/mongodb.key
docker compose up -d mongo
docker compose logs mongo
```

需要设置data权限

## Nuxt Web APP

使用`pnpm`进行启动，css采用`tailwind`