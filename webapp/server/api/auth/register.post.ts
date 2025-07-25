import { z } from 'zod'
import { hashPassword, verifyPassword, excludePassword } from '../../utils/auth'
import { generateToken } from '../../utils/jwt'
import { usePrisma } from '../../utils/prisma'

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phoneNumber: z.string().regex(/^1[3-9]\d{9}$/).optional(), // 中国手机号格式
  studentId: z.string().min(6).max(20).optional(),           // 学号长度限制
  realName: z.string().min(2).max(50).optional()             // 真实姓名长度限制
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
    const { username, email, password, phoneNumber, studentId, realName } = registerSchema.parse(body)

    const { $prisma } = await usePrisma()

    // Check if user already exists
    const existingUser = await $prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: existingUser.email === email
          ? 'Email already registered'
          : 'Username already taken'
      })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)

    const user = await $prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        phoneNumber,  // 添加手机号
        studentId,    // 添加学号
        realName      // 添加真实姓名
      }
    })

    // Generate JWT token
    const token = generateToken(user)
    const safeUser = excludePassword(user)

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
      token
    }

  } catch (error) {
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

    throw error
  }
})