import { z } from 'zod'
import { hashPassword } from '../../utils/auth'
import prisma from '../../utils/prisma'

// 验证请求参数的schema
const resetPasswordSchema = z.object({
    email: z.string().email(),
    token: z.string().min(1),
    newPassword: z.string().min(6).max(100)
})

export default defineEventHandler(async (event) => {
    if (event.method !== 'POST') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed'
        })
    }

    const body = await readBody(event)

    try {
        // 验证请求参数
        const { email, token, newPassword } = resetPasswordSchema.parse(body)

        // 查找用户
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: '用户不存在'
            })
        }

        // 验证用户状态
        if (user.status !== 'ACTIVE') {
            throw createError({
                statusCode: 403,
                statusMessage: '账户状态异常，无法重置密码'
            })
        }

        // 验证重置令牌
        if (!user.passwordResetToken) {
            throw createError({
                statusCode: 400,
                statusMessage: '密码重置令牌不存在'
            })
        }

        if (user.passwordResetToken !== token) {
            throw createError({
                statusCode: 400,
                statusMessage: '密码重置令牌无效'
            })
        }

        // 检查令牌是否过期
        if (!user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) {
            throw createError({
                statusCode: 400,
                statusMessage: '密码重置令牌已过期，请重新申请重置'
            })
        }

        // 哈希新密码
        const newPasswordHash = await hashPassword(newPassword)

        // 更新用户密码并清除重置令牌
        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                passwordHash: newPasswordHash,
                passwordResetToken: null,
                passwordResetTokenExpiresAt: null,
                updatedAt: new Date()
            }
        })

        console.log(`用户密码重置成功: ${email} (ID: ${updatedUser.id})`)

        return {
            success: true,
            message: '密码重置成功，请使用新密码登录',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                status: updatedUser.status
            }
        }

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            throw createError({
                statusCode: 400,
                statusMessage: '参数验证失败',
                data: error.issues
            })
        }

        // 如果是已知的业务错误，直接抛出
        if (error.statusCode) {
            throw error
        }

        console.error('密码重置过程中发生错误:', error)
        throw createError({
            statusCode: 500,
            statusMessage: '服务器内部错误'
        })
    }
})