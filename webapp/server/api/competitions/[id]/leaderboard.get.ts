import { processUserAvatarUrl, processTeamAvatarUrl } from '~/server/utils/url'

// 定义返回给前端的队伍统计数据结构
interface LeaderboardEntryResponse {
  rank: number
  team: {
    id: string
    name: string
    avatarUrl?: string
  }
  totalScore: number
  problemScores: Array<{
    problemId: string
    problemTitle: string
    score: number
    bestSubmission?: {
      id: string
      createdAt: Date
      score?: number
      user?: {
        username: string
        avatarUrl?: string
      }
    }
  }>
}

// 定义返回给前端的完整排行榜数据结构
interface LeaderboardResponse {
  competitionTitle: string
  leaderboard: LeaderboardEntryResponse[]
}

export default defineEventHandler(async (event) => {
  const competitionId = getRouterParam(event, 'id')
  if (!competitionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Competition ID is required'
    })
  }

  // 1. 获取比赛标题
  const competition = await prisma.competition.findUnique({
    where: {
      id: competitionId
    },
    select: {
      title: true
    }
  })

  if (!competition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Competition not found'
    })
  }

  // 2. 获取排行榜条目，包含队伍信息和题目得分详情
  const leaderboardEntries = await prisma.leaderboardEntry.findMany({
    where: {
      leaderboard: {
        competitionId: competitionId
      }
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      },
      problemScores: {
        include: {
          bestSubmission: {
            include: {
              user: {
                select: {
                  username: true,
                  avatarUrl: true
                }
              }
            }
          },
          // 包含题目信息以获取题目标题
          problem: {
            select: {
              title: true
            }
          }
        }
      }
    },
    orderBy: {
      rank: 'asc'
    }
  })

  // 3. 转换数据结构以匹配前端需求
  const finalLeaderboard: LeaderboardEntryResponse[] = leaderboardEntries.map(entry => ({
    rank: entry.rank,
    team: {
      id: entry.team.id,
      name: entry.team.name,
      avatarUrl: processTeamAvatarUrl(entry.team.avatarUrl) ?? undefined
    },
    totalScore: entry.totalScore,
    problemScores: entry.problemScores.map(problemScore => ({
      problemId: problemScore.problemId,
      // 添加题目标题
      problemTitle: problemScore.problem?.title || 'Unknown Problem',
      score: problemScore.score,
      bestSubmission: problemScore.bestSubmission ? {
        id: problemScore.bestSubmission.id,
        createdAt: problemScore.bestSubmission.createdAt,
        score: problemScore.bestSubmission.score ?? undefined,
        user: problemScore.bestSubmission.user ? {
          username: problemScore.bestSubmission.user.username,
          avatarUrl: processUserAvatarUrl(problemScore.bestSubmission.user.avatarUrl) ?? undefined
        } : undefined
      } : undefined
    }))
  }))

  // 4. 返回包含比赛标题和排行榜条目的对象
  const response: LeaderboardResponse = {
    competitionTitle: competition.title,
    leaderboard: finalLeaderboard
  }

  return response
})
