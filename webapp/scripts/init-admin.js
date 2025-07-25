// 初始化管理员账户脚本
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function initAdmin() {
    const prisma = new PrismaClient()

    try {
        // 检查是否已存在管理员账户
        const adminUser = await prisma.user.findFirst({
            where: {
                role: 'admin'
            }
        })

        if (adminUser) {
            console.log('✅ 管理员账户已存在，无需创建')
            return
        }

        // 检查是否已存在用户名为admin的账户
        const existingAdmin = await prisma.user.findUnique({
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
        const hashedPassword = await bcrypt.hash(defaultPassword, 12)

        const newAdmin = await prisma.user.create({
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
    } finally {
        await prisma.$disconnect()
    }
}

// 使脚本既可以作为独立程序运行，也可以被其他模块导入
if (require.main === module) {
    initAdmin()
}

module.exports = { initAdmin }