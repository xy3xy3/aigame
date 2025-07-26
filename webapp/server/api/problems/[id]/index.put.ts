import { z } from 'zod'
import prisma from '../../../utils/prisma'
import { invalidateProblemCache } from '../../../utils/redis'

const updateProblemSchema = z.object({
  title: z.string().min(2).max(100),
  shortDescription: z.string(),
  detailedDescription: z.string(),
  datasetUrl: z.string().url().optional(),
  judgingScriptUrl: z.string().url().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
})

export default defineEventHandler(async (event) => {
  if (event.method !== 'PUT') {
    throw createError({
      statusCode: 405,
      statusMessage: '方法不被允许'
    })
  }

  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '需要身份验证'
    })
  }

  const problemId = getRouterParam(event, 'id')
  if (!problemId) {
    throw createError({
      statusCode: 400,
      statusMessage: '题目ID不能为空'
    })
  }

  const body = await readBody(event)

  try {
    const { title, shortDescription, detailedDescription, datasetUrl, judgingScriptUrl, startTime, endTime } = updateProblemSchema.parse(body)

    // 验证时间逻辑
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (start >= end) {
      throw createError({
        statusCode: 400,
        statusMessage: '结束时间必须在开始时间之后'
      })
    }



    // 验证题目是否存在
    const existingProblem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        competition: true
      }
    })

    if (!existingProblem) {
      throw createError({
        statusCode: 404,
        statusMessage: '题目未找到'
      })
    }

    // 检查权限（只有比赛创建者可以编辑题目）
    if (existingProblem.competition.createdBy !== user.id) {
      // TODO: 当添加角色系统后，检查是否为管理员
      throw createError({
        statusCode: 403,
        statusMessage: '权限被拒绝。只有比赛创建者可以编辑此题目。'
      })
    }

    // 检查是否有同名题目（排除当前题目）
    const duplicateProblem = await prisma.problem.findFirst({
      where: {
        title,
        competitionId: existingProblem.competitionId,
        id: { not: problemId }
      }
    })

    if (duplicateProblem) {
      throw createError({
        statusCode: 400,
        statusMessage: '该比赛下已存在相同标题的题目'
      })
    }

    // 更新题目
    const problem = await prisma.problem.update({
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

    // 清除缓存
    try {
      await invalidateProblemCache(problemId)
    } catch (error) {
      console.log('Redis not available, skipping cache invalidation')
    }

    return {
      success: true,
      problem
    }

  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: '验证失败',
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
      statusMessage: '更新题目失败',
      data: error.message
    })
  }
})
