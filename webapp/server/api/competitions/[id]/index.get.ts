import { getCachedCompetition, cacheCompetition } from '../../../utils/redis'
import { usePrisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const competitionId = getRouterParam(event, 'id')

  // 尝试从缓存获取 (如果Redis可用)
  try {
    const cachedCompetition = await getCachedCompetition(competitionId)
    if (cachedCompetition) {
      return {
        success: true,
        competition: cachedCompetition
      }
    }
  } catch (error) {
    console.log('Redis not available, skipping cache')
  }

  const { $prisma } = await usePrisma()

  const competition = await $prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      problems: {
        orderBy: {
          startTime: 'asc'
        }
      },
      _count: {
        select: {
          submissions: true
        }
      }
    }
  })

  if (!competition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Competition not found'
    })
  }

  // 添加状态信息
  const now = new Date()
  let status = 'upcoming'
  if (competition.startTime <= now && competition.endTime > now) {
    status = 'ongoing'
  } else if (competition.endTime <= now) {
    status = 'ended'
  }

  const competitionWithStatus = {
    ...competition,
    status
  }

  // 缓存结果（30分钟）- 如果Redis可用
  try {
    await cacheCompetition(competitionId, competitionWithStatus, 1800)
  } catch (error) {
    console.log('Redis not available, skipping cache')
  }

  return {
    success: true,
    competition: competitionWithStatus
  }
})
