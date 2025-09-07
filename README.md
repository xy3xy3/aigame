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


## python evaluate

需要先安装uv，之后
```shell
uv sync
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

## 脚本

项目包含一些用于数据库初始化和数据生成的辅助脚本，位于 `webapp/scripts` 目录下。

**重要:** 直接使用 `node` 运行这些脚本会失败，因为它们需要加载 `.env` 文件中的数据库连接等环境变量。请使用下面定义的 `pnpm` 命令来运行它们。

首先，确保你已经根据 `.env.example` 创建了 `.env` 文件：
```shell
cd webapp
cp .env.example .env
```
然后，你可以使用 `pnpm` 运行以下脚本命令 (我们将在下一步中把这些命令添加到 `package.json`):

### `db:init`

初始化数据库，主要用于测试数据库连接。

**用法:**
```shell
cd webapp
pnpm db:init
```

### `db:admin`

创建一个默认的管理员账户。如果已存在管理员或用户名为 `admin` 的账户，则不会创建。

-   **默认用户名:** `admin`
-   **默认密码:** `123456`

**用法:**
```shell
cd webapp
pnpm db:admin
```

### `minio:init`

初始化MinIO存储桶，确保存储桶存在并设置为公共读取权限。脚本会创建名为 `aigame` 的存储桶。

**用法:**
```shell
cd webapp
pnpm minio:init
```

### `db:seed`

为数据库生成一套完整的测试数据，包括竞赛、题目、队伍、用户、提交记录和排行榜。

**注意:** 此脚本会先**清空**数据库中除 `admin` 用户外的大部分数据，请谨慎在生产环境中使用。

**用法:**
```shell
cd webapp
pnpm db:seed
```


## 备注

### docker mongodb验证用户id的方法

```shell
docker run --rm swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/mongodb/mongodb-community-server:8.0.13-ubuntu2204 id -u mongodb
```