import { z } from 'zod'
import { randomBytes } from 'crypto'
import { hashPassword, verifyPassword, excludePassword } from '../../utils/auth'
import { generateToken } from '../../utils/jwt'
import { sendEmailVerification } from '../../utils/email'
import prisma from '../../utils/prisma'

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phoneNumber: z.string().regex(/^1[3-9]\d{9}$/).optional(), // 中国手机号格式
  studentId: z.string().min(6).max(20).optional(),           // 学号长度限制
  realName: z.string().min(2).max(50).optional(),            // 真实姓名长度限制
  education: z.enum(['BACHELOR', 'MASTER', 'DOCTORATE']).optional() // 学历选项
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
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
    // Validate request body
    const { username, email, password, phoneNumber, studentId, realName, education } = registerSchema.parse(body)



    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      const errorMessage = existingUser.email === email
        ? 'Email already registered'
        : 'Username already taken'
      console.log('🔍 [DEBUG] 用户已存在错误:', {
        statusCode: 409,
        statusMessage: errorMessage,
        existingEmail: existingUser.email,
        requestEmail: email
      })
      throw createError({
        statusCode: 409,
        statusMessage: errorMessage
      })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex')
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        phoneNumber,  // 添加手机号
        studentId,    // 添加学号
        realName,     // 添加真实姓名
        education,    // 添加学历
        status: 'PENDING', // 设置用户状态为待验证
        emailVerificationToken,
        emailVerificationExpires
      }
    })

    // 发送验证邮件
    try {
      const emailSent = await sendEmailVerification(email, emailVerificationToken, username)
      if (!emailSent) {
        console.warn(`邮件发送失败，但用户注册成功: ${email}`)
      }
    } catch (emailError) {
      console.error('发送验证邮件时出错:', emailError)
      // 邮件发送失败不阻止注册流程
    }

    // Generate JWT token
    const token = generateToken(user)

    // 排除敏感字段的安全用户信息
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      phoneNumber: user.phoneNumber,
      studentId: user.studentId,
      realName: user.realName,
      education: user.education,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    // Set HTTP-only cookie
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return {
      success: true,
      user: safeUser,
      token,
      message: '注册成功，请查收邮件进行验证'
    }

  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'User already exists'
      })
    }

    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: error.issues
      })
    }

    console.error('注册过程中发生错误:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})