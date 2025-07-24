// MongoDB 初始化脚本
// 初始化单节点副本集

rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "mongo:27017"
    }
  ]
});
