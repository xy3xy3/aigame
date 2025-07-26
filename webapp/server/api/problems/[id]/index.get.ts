import { getCachedProblem, cacheProblem } from '../../../utils/redis'
import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  event.node.res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const problemId = getRouterParam(event, 'id')

  // 尝试从缓存获取 (如果Redis可用)
  try {
    const cachedProblem = await getCachedProblem(problemId)
    if (cachedProblem) {
      return {
        success: true,
        problem: cachedProblem
      }
    }
  } catch (error) {
    console.log('Redis not available, skipping cache')
  }



  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      detailedDescription: true,
      competitionId: true,
      datasetUrl: true,
      judgingScriptUrl: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      updatedAt: true,
      score: true,
      competition: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true
        }
      },
      _count: {
        select: {
          submissions: true
        }
      }
    }
  })

  if (!problem) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Problem not found'
    })
  }

  // 添加状态信息
  const now = new Date()
  let status = 'upcoming'
  if (problem.startTime <= now && problem.endTime > now) {
    status = 'ongoing'
  } else if (problem.endTime <= now) {
    status = 'ended'
  }

  const problemWithStatus = {
    ...problem,
    status
  }

  // 缓存结果（30分钟）- 如果Redis可用
  try {
    await cacheProblem(problemId, problemWithStatus, 1800)
  } catch (error) {
    console.log('Redis not available, skipping cache')
  }

  return {
    success: true,
    problem: problemWithStatus
  }
})
