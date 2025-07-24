import { z } from 'zod'
import { usePrisma } from '../../../utils/prisma'

const updateProblemSchema = z.object({
  title: z.string().min(2).max(100),
  shortDescription: z.string().min(10).max(500),
  detailedDescription: z.string().min(50).max(10000),
  datasetUrl: z.string().url().optional(),
  judgingScriptUrl: z.string().url().optional(),
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

  const problemId = getRouterParam(event, 'id')
  const body = await readBody(event)

  try {
    const { title, shortDescription, detailedDescription, datasetUrl, judgingScriptUrl, startTime, endTime } = updateProblemSchema.parse(body)

    // 验证时间逻辑
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (start >= end) {
      throw createError({
        statusCode: 400,
        statusMessage: 'End time must be after start time'
      })
    }

    const { $prisma } = await usePrisma()

    // 验证题目是否存在
    const existingProblem = await $prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        competition: true
      }
    })

    if (!existingProblem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Problem not found'
      })
    }

    // 检查权限（只有比赛创建者可以编辑题目）
    if (existingProblem.competition.createdBy !== user.id) {
      // TODO: 当添加角色系统后，检查是否为管理员
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied. Only the competition creator can edit this problem.'
      })
    }

    // 检查是否有同名题目（排除当前题目）
    const duplicateProblem = await $prisma.problem.findFirst({
      where: {
        title,
        competitionId: existingProblem.competitionId,
        id: { not: problemId }
      }
    })

    if (duplicateProblem) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Problem with this title already exists in this competition'
      })
    }

    // 更新题目
    const problem = await $prisma.problem.update({
      where: { id: problemId },
      data: {
        title,
        shortDescription,
        detailedDescription,
        datasetUrl,
        judgingScriptUrl,
        startTime: start,
        endTime: end
      },
      include: {
        competition: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      }
    })

    return {
      success: true,
      problem
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
    console.error('Update problem error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update problem',
      data: error.message
    })
  }
})
