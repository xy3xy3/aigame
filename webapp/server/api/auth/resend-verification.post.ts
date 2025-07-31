import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendEmailVerification } from '../../utils/email'
import prisma from '../../utils/prisma'

// 验证请求参数的schema
const resendVerificationSchema = z.object({
    email: z.string().email()
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
        const { email } = resendVerificationSchema.parse(body)

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
                statusMessage: '邮箱已验证，无需重发验证邮件'
            })
        }

        if (user.status === 'BANNED') {
            throw createError({
                statusCode: 403,
                statusMessage: '账户已被封禁，无法发送验证邮件'
            })
        }

        if (user.status !== 'PENDING') {
            throw createError({
                statusCode: 400,
                statusMessage: '用户状态异常，无法发送验证邮件'
            })
        }

        // 生成新的验证令牌（24小时有效期）
        const emailVerificationToken = randomBytes(32).toString('hex')
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期

        // 更新用户的验证令牌
        await prisma.user.update({
            where: { email },
            data: {
                emailVerificationToken,
                emailVerificationExpires,
                updatedAt: new Date()
            }
        })

        // 发送新的验证邮件
        try {
            const emailSent = await sendEmailVerification(email, emailVerificationToken, user.username)
            if (emailSent) {
                console.log(`验证邮件重发成功: ${email} (用户: ${user.username})`)
                return {
                    success: true,
                    message: '验证邮件已重新发送，请查收邮件进行验证'
                }
            } else {
                console.warn(`验证邮件重发失败: ${email}`)
                throw createError({
                    statusCode: 500,
                    statusMessage: '邮件发送失败，请稍后重试'
                })
            }
        } catch (emailError) {
            console.error('重发验证邮件时出错:', emailError)
            throw createError({
                statusCode: 500,
                statusMessage: '邮件发送失败，请稍后重试'
            })
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

        console.error('重发验证邮件过程中发生错误:', error)
        throw createError({
            statusCode: 500,
            statusMessage: '服务器内部错误'
        })
    }
})