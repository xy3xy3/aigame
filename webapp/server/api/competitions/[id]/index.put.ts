import { z } from 'zod'
import { usePrisma } from '../../../utils/prisma'

const updateCompetitionSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(2000),
  rules: z.string().max(5000),
  bannerUrl: z.string().url().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
})

export default defineEventHandler(async (event) => {
  if (event.method !== 'PUT') {
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

  const competitionId = getRouterParam(event, 'id')
  const body = await readBody(event)

  try {
    const { title, description, rules, bannerUrl, startTime, endTime } = updateCompetitionSchema.parse(body)

    // 验证时间逻辑
    // 确保时间字符串被正确解析为 UTC 时间
    const start = new Date(startTime)
    const end = new Date(endTime)

    // 确保解析后的时间是有效的
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid time format'
      })
    }

    if (start >= end) {
      throw createError({
        statusCode: 400,
        statusMessage: 'End time must be after start time'
      })
    }

    const { $prisma } = await usePrisma()

    // 验证比赛是否存在
    const existingCompetition = await $prisma.competition.findUnique({
      where: { id: competitionId }
    })

    if (!existingCompetition) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Competition not found'
      })
    }

    // 检查权限（只有创建者可以编辑）
    if (existingCompetition.createdBy !== user.id) {
      // TODO: 当添加角色系统后，检查是否为管理员
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied. Only the creator can edit this competition.'
      })
    }

    // 检查是否有同名比赛（排除当前比赛）
    const duplicateCompetition = await $prisma.competition.findFirst({
      where: {
        title,
        id: { not: competitionId }
      }
    })

    if (duplicateCompetition) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Competition with this title already exists'
      })
    }

    // 更新比赛
    const competition = await $prisma.competition.update({
      where: { id: competitionId },
      data: {
        title,
        description,
        rules,
        bannerUrl,
        startTime: start,
        endTime: end
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

    // 如果是我们抛出的错误，直接重新抛出
    if (error.statusCode) {
      throw error
    }

    // 处理其他错误
    console.error('Update competition error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update competition',
      data: error.message
    })
  }
})
