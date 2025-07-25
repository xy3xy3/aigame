import { z } from 'zod'
import { verifyPassword, hashPassword } from '../../../utils/auth'
import prisma from '../../../utils/prisma'

const passwordChangeSchema = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1)
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
})

export default defineEventHandler(async (event) => {
    if (event.method !== 'PUT') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed'
        })
    }

    // 1. 确保用户已登录
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        })
    }

    const body = await readBody(event)

    try {
        // 2. 从请求体中读取和校验密码
        const { oldPassword, newPassword } = passwordChangeSchema.parse(body)

        // 3. 验证用户的 oldPassword 是否正确
        const currentUser = await prisma.user.findUnique({
            where: { id: user.id }
        })

        if (!currentUser) {
            throw createError({
                statusCode: 404,
                statusMessage: 'User not found'
            })
        }

        const isOldPasswordValid = await verifyPassword(oldPassword, currentUser.passwordHash)
        if (!isOldPasswordValid) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid old password'
            })
        }

        // 4. 将 newPassword 哈希化并更新到数据库
        const newPasswordHash = await hashPassword(newPassword)
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash }
        })

        return {
            success: true,
            message: 'Password updated successfully'
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation failed',
                data: error.issues
            })
        }
        throw error
    }
})