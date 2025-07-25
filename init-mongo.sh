#!/bin/bash
set -e # 如果任何命令失败，则立即退出

# 1. 在后台启动 mongod 进程
# 使用 --replSet 参数，并允许所有 IP 连接
mongod --replSet rs0 --bind_ip_all &

# 2. 等待 mongod 进程完全启动
# 我们通过循环 ping 数据库来检查它是否准备好接受连接
echo "Waiting for MongoDB to start..."
until mongosh --eval "db.adminCommand('ping')"; do
  sleep 1
done
echo "MongoDB started successfully."

# 3. 执行初始化命令
# 使用 mongosh 执行 rs.initiate()。
# 为了让脚本可以重复运行（幂等性），我们检查副本集是否已经配置。
# rs.status() 会在未初始化时抛出错误，我们可以利用这一点。
mongosh --eval "
try {
  rs.status();
  print('Replica set already initialized.');
} catch (e) {
  print('Initializing replica set...');
  rs.initiate({
    _id: 'rs0',
    members: [
      { _id: 0, host: 'localhost:27017' }
    ]
  });
}
"
echo "MongoDB replica set configured."

# 4. 将后台的 mongod 进程转到前台
# 这样脚本就不会立即退出，容器也会保持运行状态
# `wait` 命令会等待后台进程（由 $! 获取其 PID）结束
wait $!