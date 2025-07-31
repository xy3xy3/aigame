import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendPasswordReset } from '../../utils/email'
import prisma from '../../utils/prisma'

// 验证请求参数的schema
const forgotPasswordSchema = z.object({
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
        const { email } = forgotPasswordSchema.parse(body)

        // 查找用户
        const user = await prisma.user.findUnique({
            where: { email }
        })

        // 为了安全起见，无论用户是否存在都返回成功消息
        // 但只有在用户存在且状态为ACTIVE时才发送邮件
        if (user) {
            // 验证用户状态
            if (user.status !== 'ACTIVE') {
                // 对于非激活用户，不发送密码重置邮件，但仍返回成功消息
                console.log(`密码重置请求被拒绝 - 用户状态不是ACTIVE: ${email} (状态: ${user.status})`)
                return {
                    success: true,
                    message: '如果该邮箱地址存在于我们的系统中，您将收到密码重置邮件'
                }
            }

            // 生成密码重置令牌（1小时有效期）
            const resetToken = randomBytes(32).toString('hex')
            const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1小时后过期

            // 更新用户的重置令牌
            await prisma.user.update({
                where: { email },
                data: {
                    passwordResetToken: resetToken,
                    passwordResetTokenExpiresAt: resetTokenExpires
                }
            })

            // 发送密码重置邮件
            try {
                const emailSent = await sendPasswordReset(email, resetToken, user.username)
                if (emailSent) {
                    console.log(`密码重置邮件发送成功: ${email}`)
                } else {
                    console.warn(`密码重置邮件发送失败: ${email}`)
                }
            } catch (emailError) {
                console.error('发送密码重置邮件时出错:', emailError)
                // 邮件发送失败不影响API响应，但会记录日志
            }
        } else {
            console.log(`密码重置请求 - 用户不存在: ${email}`)
        }

        // 统一返回成功消息（安全考虑）
        return {
            success: true,
            message: '如果该邮箱地址存在于我们的系统中，您将收到密码重置邮件'
        }

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            throw createError({
                statusCode: 400,
                statusMessage: '参数验证失败',
                data: error.issues
            })
        }

        console.error('密码重置请求过程中发生错误:', error)
        throw createError({
            statusCode: 500,
            statusMessage: '服务器内部错误'
        })
    }
})