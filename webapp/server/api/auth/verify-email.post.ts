import { z } from 'zod'
import prisma from '../../utils/prisma'

// 验证请求参数的schema
const verifyEmailSchema = z.object({
    email: z.string().email(),
    token: z.string().min(1)
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
        const { email, token } = verifyEmailSchema.parse(body)

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
        if (user.status === 'ACTIVE') {
            throw createError({
                statusCode: 400,
                statusMessage: '邮箱已验证，无需重复验证'
            })
        }

        if (user.status === 'BANNED') {
            throw createError({
                statusCode: 403,
                statusMessage: '账户已被封禁'
            })
        }

        // 验证令牌
        if (!user.emailVerificationToken) {
            throw createError({
                statusCode: 400,
                statusMessage: '验证令牌不存在'
            })
        }

        if (user.emailVerificationToken !== token) {
            throw createError({
                statusCode: 400,
                statusMessage: '验证令牌无效'
            })
        }

        // 检查令牌是否过期
        if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
            throw createError({
                statusCode: 400,
                statusMessage: '验证令牌已过期，请重新申请验证'
            })
        }

        // 更新用户状态
        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
                emailVerificationExpires: null
            }
        })

        console.log(`用户邮箱验证成功: ${email} (ID: ${updatedUser.id})`)

        return {
            success: true,
            message: '邮箱验证成功，您的账户已激活',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                status: updatedUser.status,
                emailVerifiedAt: updatedUser.emailVerifiedAt
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

        console.error('邮箱验证过程中发生错误:', error)
        throw createError({
            statusCode: 500,
            statusMessage: '服务器内部错误'
        })
    }
})