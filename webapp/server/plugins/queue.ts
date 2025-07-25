import { usePrisma } from '../utils/prisma'
import { hashPassword } from '../utils/auth'

export default async () => {
  // 在服务器启动时自动启动评测队列工作器
  // 暂时禁用，因为Redis未安装
  console.log('Queue worker disabled - Redis not available')

  // 尝试创建默认管理员账户
  try {
    console.log('Checking for admin user...')
    const { $prisma } = await usePrisma()

    // 检查是否已存在管理员账户
    const adminUser = await $prisma.user.findFirst({
      where: {
        role: 'admin'
      }
    })

    if (adminUser) {
      console.log('✅ 管理员账户已存在，无需创建')
      return
    }

    // 检查是否已存在用户名为admin的账户
    const existingAdmin = await $prisma.user.findUnique({
      where: {
        username: 'admin'
      }
    })

    if (existingAdmin) {
      console.log('⚠️  用户名admin已存在，但不是管理员账户')
      return
    }

    // 创建默认管理员账户
    const defaultPassword = '123456'
    const hashedPassword = await hashPassword(defaultPassword)

    const newAdmin = await $prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        role: 'admin'
      }
    })

    console.log('✅ 成功创建默认管理员账户')
    console.log(`用户名: ${newAdmin.username}`)
    console.log(`密码: ${defaultPassword} (请在首次登录后立即修改)`)
    console.log(`角色: ${newAdmin.role}`)
  } catch (error) {
    console.error('❌ 创建管理员账户失败:', error)
  }

  // try {
  //   console.log('Starting evaluation worker...')
  //   const worker = startEvaluationWorker()
  //   console.log(`Evaluation worker started with ID: ${worker.id}`)
  // } catch (error) {
  //   console.error('Failed to start evaluation worker:', error)
  // }
}
