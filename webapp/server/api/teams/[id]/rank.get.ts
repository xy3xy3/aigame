import { getTeamRank } from '../../../utils/redis'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
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

  const teamId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const competitionId = query.competitionId as string
  
  if (!competitionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Competition ID is required'
    })
  }
  
  const { $prisma } = await usePrisma()
  
  // 验证用户是否属于该队伍
  const teamMember = await $prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: user.id
    }
  })
  
  if (!teamMember) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You are not a member of this team'
    })
  }
  
  try {
    // 从Redis获取排名
    const redisRank = await getTeamRank(competitionId, teamId)
    
    if (redisRank) {
      return {
        success: true,
        rank: redisRank.rank,
        score: redisRank.score,
        source: 'redis'
      }
    }
    
    // 如果Redis中没有数据，从数据库获取
    const leaderboardEntry = await $prisma.leaderboardEntry.findFirst({
      where: {
        teamId,
        leaderboard: {
          competitionId
        }
      },
      include: {
        leaderboard: {
          select: {
            competitionId: true
          }
        }
      }
    })
    
    if (leaderboardEntry) {
      return {
        success: true,
        rank: leaderboardEntry.rank,
        score: leaderboardEntry.totalScore,
        source: 'database'
      }
    }
    
    // 如果没有排名记录，返回未排名状态
    return {
      success: true,
      rank: null,
      score: 0,
      source: 'none'
    }
    
  } catch (error) {
    console.error('Error fetching team rank:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch team rank'
    })
  }
})
