import { z } from 'zod'
import { usePrisma } from '../../../../utils/prisma'

const createProblemSchema = z.object({
  title: z.string().min(2).max(100),
  shortDescription: z.string().min(10).max(500),
  detailedDescription: z.string().min(50).max(10000),
  datasetUrl: z.string().url().optional(),
  judgingScriptUrl: z.string().url().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
})

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: '方法不允许'
    })
  }

  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '需要身份验证'
    })
  }

  const competitionId = getRouterParam(event, 'id')
  const body = await readBody(event)

  try {
    const { title, shortDescription, detailedDescription, datasetUrl, judgingScriptUrl, startTime, endTime } = createProblemSchema.parse(body)

    const { $prisma } = await usePrisma()

    // 验证比赛是否存在且用户有权限
    const competition = await $prisma.competition.findUnique({
      where: { id: competitionId }
    })

    if (!competition) {
      throw createError({
        statusCode: 404,
        statusMessage: '未找到比赛'
      })
    }

    // TODO: 添加管理员权限检查
    // if (competition.createdBy !== user.id && user.role !== 'admin') {
    //   throw createError({
    //     statusCode: 403,
    //     statusMessage: 'Permission denied'
    //   })
    // }

    // 验证时间逻辑
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (start >= end) {
      throw createError({
        statusCode: 400,
        statusMessage: '结束时间必须在开始时间之后'
      })
    }

    if (start < competition.startTime || end > competition.endTime) {
      throw createError({
        statusCode: 400,
        statusMessage: '题目时间必须在比赛时间范围内'
      })
    }

    // 检查是否已存在同名题目
    const existingProblem = await $prisma.problem.findFirst({
      where: {
        competitionId,
        title
      }
    })

    if (existingProblem) {
      throw createError({
        statusCode: 400,
        statusMessage: '该比赛下已存在同名题目'
      })
    }

    // 创建题目
    const problem = await $prisma.problem.create({
      data: {
        title,
        shortDescription,
        detailedDescription,
        competitionId,
        datasetUrl,
        judgingScriptUrl,
        startTime: start,
        endTime: end
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
        statusMessage: '验证失败',
        data: error.issues
      })
    }

    throw error
  }
})
