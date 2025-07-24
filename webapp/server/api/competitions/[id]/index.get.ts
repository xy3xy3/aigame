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
  if (!competitionId) {
    throw createError({
      statusCode: 400,
      statusMessage: '比赛ID不能为空'
    })
  }

  // 获取用户信息（如果已登录）
  const user = event.context.user

  // 尝试从缓存获取 (如果Redis可用)
  try {
    const cachedCompetition = await getCachedCompetition(competitionId)
    if (cachedCompetition) {
      // 如果有缓存，仍需要检查用户参赛状态
      let userParticipating = false
      if (user) {
        const { $prisma } = await usePrisma()
        const userTeams = await $prisma.team.findMany({
          where: {
            members: {
              some: {
                userId: user.id
              }
            },
            participatingIn: {
              has: competitionId
            }
          }
        })
        userParticipating = userTeams.length > 0
      }

      return {
        success: true,
        competition: {
          ...cachedCompetition,
          userParticipating
        }
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

  // 检查用户参赛状态
  let userParticipating = false
  if (user) {
    const userTeams = await $prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: user.id
          }
        },
        participatingIn: {
          has: competitionId
        }
      }
    })
    userParticipating = userTeams.length > 0
  }

  const competitionWithStatus = {
    ...competition,
    status,
    userParticipating
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
