#!/bin/bash
# --- 自动化初始化脚本 (已修正) ---

# 1. 从 docker-compose.yml 文件中自动且精确地提取 MongoDB 的镜像名称
#    使用更健壮的命令，确保只抓取 mongo 服务下的 image 标签。
MONGO_IMAGE=$(grep -A 3 "mongo:" docker-compose.yml | grep "image:" | awk '{print $2}')

if [ -z "$MONGO_IMAGE" ]; then
    echo "❌ 错误：无法在 docker-compose.yml 的 'mongo:' 服务下找到 'image:' 标签。"
    exit 1
fi

echo "--> 检测到 MongoDB 镜像为: $MONGO_IMAGE"

# 2. 动态获取该镜像内 'mongodb' 用户的 UID 和 GID
echo "--> 正在获取用户和组 ID..."
MONGO_UID=$(docker run --rm "$MONGO_IMAGE" id -u mongodb)
MONGO_GID=$(docker run --rm "$MONGO_IMAGE" id -g mongodb)

# 检查是否成功获取到纯数字的ID
if ! [[ "$MONGO_UID" =~ ^[0-9]+$ ]] || ! [[ "$MONGO_GID" =~ ^[0-9]+$ ]]; then
    echo "❌ 错误：无法从镜像 '$MONGO_IMAGE' 获取有效的用户或组 ID。"
    echo "   请检查镜像名称是否正确，以及该镜像是否存在 'mongodb' 用户。"
    exit 1
fi

echo "✅ 成功获取! 用户ID (UID): $MONGO_UID, 组ID (GID): $MONGO_GID"

# 3. 创建目录和密钥文件，并使用动态获取的 ID 设置权限
echo "--> 正在创建目录和密钥文件..."
mkdir -p ./data/mongo
openssl rand -base64 756 > ./data/mongodb.key

echo "--> 正在设置文件和目录权限..."
sudo chown -R "$MONGO_UID:$MONGO_GID" ./data/mongo
sudo chown "$MONGO_UID:$MONGO_GID" ./data/mongodb.key
sudo chmod 400 ./data/mongodb.key
echo "✅ 权限设置完成。"

# 4. 启动 MongoDB 服务
echo "--> 正在启动 MongoDB 容器..."
docker compose up -d mongo

# 5. 等待几秒钟，确保 MongoDB 服务已完全启动，然后再初始化副本集
echo "--> 等待 10 秒让 MongoDB 充分准备..."
sleep 10

# 6. 初始化副本集
echo "--> 正在初始化 MongoDB 副本集..."
docker compose exec mongo mongosh -u root -p password --authenticationDatabase admin --eval 'rs.initiate({ _id: "rs0", members: [ { _id: 0, host: "mongo:27017" } ]})'

echo "🎉 MongoDB 初始化成功完成！"