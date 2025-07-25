import { getLeaderboard } from '../../../utils/redis'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const competitionId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const limit = parseInt(query.limit as string) || 100
  const useCache = query.cache !== 'false'



  // 验证比赛是否存在
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true
    }
  })

  if (!competition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Competition not found'
    })
  }

  try {
    let leaderboardData = []

    if (useCache) {
      // 尝试从Redis获取排行榜
      const redisLeaderboard = await getLeaderboard(competitionId, limit)

      if (redisLeaderboard.length > 0) {
        // 获取队伍详细信息
        const teamIds = redisLeaderboard.map(entry => entry.teamId)
        const teams = await prisma.team.findMany({
          where: { id: { in: teamIds } },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            captain: {
              select: {
                username: true
              }
            }
          }
        })

        const teamMap = new Map(teams.map(team => [team.id, team]))

        leaderboardData = redisLeaderboard.map(entry => ({
          rank: entry.rank,
          team: teamMap.get(entry.teamId) || {
            id: entry.teamId,
            name: 'Unknown Team',
            avatarUrl: null,
            captain: { username: 'Unknown' }
          },
          totalScore: entry.score,
          problemScores: [] // TODO: 实现题目分数详情
        }))
      }
    }

    // 如果Redis中没有数据，从数据库获取
    if (leaderboardData.length === 0) {
      const dbLeaderboard = await prisma.leaderboard.findUnique({
        where: { competitionId },
        include: {
          rankings: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  captain: {
                    select: {
                      username: true
                    }
                  }
                }
              }
            },
            orderBy: { rank: 'asc' },
            take: limit
          }
        }
      })

      if (dbLeaderboard) {
        leaderboardData = dbLeaderboard.rankings.map(entry => ({
          rank: entry.rank,
          team: entry.team,
          totalScore: entry.totalScore,
          problemScores: entry.problemScores
        }))
      }
    }

    // 获取比赛统计信息
    const stats = await prisma.submission.groupBy({
      by: ['teamId'],
      where: { competitionId },
      _count: {
        id: true
      },
      _max: {
        score: true
      }
    })

    const totalTeams = stats.length
    const totalSubmissions = await prisma.submission.count({
      where: { competitionId }
    })

    return {
      success: true,
      leaderboard: leaderboardData,
      competition,
      stats: {
        totalTeams,
        totalSubmissions,
        lastUpdated: new Date()
      }
    }

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch leaderboard'
    })
  }
})
