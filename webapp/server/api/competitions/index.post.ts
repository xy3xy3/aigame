import { z } from 'zod'
import prisma from '../../utils/prisma'
import { requireAdminRole } from '../../utils/auth'

const createCompetitionSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(2000),
  rules: z.string().max(5000),
  bannerUrl: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
})

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Check admin role
  requireAdminRole(user)

  const body = await readBody(event)

  try {
    const { title, description, rules, bannerUrl, startTime, endTime } = createCompetitionSchema.parse(body)

    // 验证时间逻辑
    // 确保时间字符串被正确解析为 UTC 时间
    const start = new Date(startTime)
    const end = new Date(endTime)

    // 确保解析后的时间是有效的
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: '无效的时间格式'
      })
    }

    if (start >= end) {
      throw createError({
        statusCode: 400,
        statusMessage: '结束时间必须晚于开始时间'
      })
    }



    // 检查是否已存在同名比赛
    const existingCompetition = await prisma.competition.findFirst({
      where: { title }
    })

    if (existingCompetition) {
      throw createError({
        statusCode: 400,
        statusMessage: '已存在同名的比赛'
      })
    }

    // 创建比赛
    const competition = await prisma.competition.create({
      data: {
        title,
        description,
        rules,
        bannerUrl,
        startTime: start,
        endTime: end,
        createdBy: user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        problems: true
      }
    })

    return {
      success: true,
      competition
    }

  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: error.issues
      })
    }

    throw error
  }
})
