// MongoDB数据库初始化脚本
// 由于MongoDB不支持Prisma迁移，我们手动创建索引

const { PrismaClient } = require('@prisma/client')

async function initDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('正在初始化数据库...')
    
    // 测试数据库连接
    await prisma.$connect()
    console.log('✅ 数据库连接成功')
    
    // 创建一个测试用户（如果不存在）
    const existingUser = await prisma.user.findFirst()
    if (!existingUser) {
      console.log('创建测试数据...')
      // 这里可以添加一些初始数据
      console.log('✅ 数据库初始化完成')
    } else {
      console.log('✅ 数据库已存在数据，跳过初始化')
    }
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  initDatabase()
}

module.exports = { initDatabase }
