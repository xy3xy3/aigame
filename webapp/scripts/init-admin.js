import { PrismaClient } from '@prisma/client'

async function initAdmin() {
    const prisma = new PrismaClient()

    try {
        // 查找第一个用户并将其设置为管理员
        const firstUser = await prisma.user.findFirst({
            orderBy: {
                createdAt: 'asc'
            }
        })

        if (firstUser) {
            await prisma.user.update({
                where: { id: firstUser.id },
                data: { role: 'admin' }
            })
            console.log(`User ${firstUser.username} has been set as admin`)
        } else {
            console.log('No users found')
        }
    } catch (error) {
        console.error('Error setting admin:', error)
    } finally {
        await prisma.$disconnect()
    }
}

initAdmin()