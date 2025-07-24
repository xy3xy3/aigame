import { z } from 'zod'
import { usePrisma } from '../../utils/prisma'

const createCompetitionSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(2000),
  rules: z.string().max(5000),
  bannerUrl: z.string().url().optional(),
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

  // TODO: 添加管理员权限检查
  // if (user.role !== 'admin') {
  //   throw createError({
  //     statusCode: 403,
  //     statusMessage: 'Admin access required'
  //   })
  // }

  const body = await readBody(event)

  try {
    const { title, description, rules, bannerUrl, startTime, endTime } = createCompetitionSchema.parse(body)

    // 验证时间逻辑
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (start >= end) {
      throw createError({
        statusCode: 400,
        statusMessage: '结束时间必须晚于开始时间'
      })
    }

    const { $prisma } = await usePrisma()

    // 检查是否已存在同名比赛
    const existingCompetition = await $prisma.competition.findFirst({
      where: { title }
    })

    if (existingCompetition) {
      throw createError({
        statusCode: 400,
        statusMessage: '已存在同名的比赛'
      })
    }

    // 创建比赛
    const competition = await $prisma.competition.create({
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
