import { Prisma } from '@prisma/client'

// 定义返回给前端的队伍统计数据结构
interface TeamLeaderboardEntry {
  rank: number
  team: {
    id: string
    name: string
  }
  problemsSolved: number
  totalPenalty: number
  problemStats: Record<string, {
    attempts: number
    solved: boolean
    penalty: number
  }>
}

export default defineEventHandler(async (event) => {
  const competitionId = getRouterParam(event, 'id')
  if (!competitionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Competition ID is required'
    })
  }

  // 1. 获取比赛和其包含的问题
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      problems: {
        select: { id: true }
      }
    }
  })

  if (!competition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Competition not found'
    })
  }

  const problemIds = competition.problems.map(p => p.id)

  // 2. 获取所有相关的提交记录
  const submissions = await prisma.submission.findMany({
    where: {
      competitionId: competitionId,
      // 仅在比赛期间的提交有效
      submittedAt: {
        gte: competition.startTime,
        lte: competition.endTime,
      },
    },
    select: {
      id: true,
      teamId: true,
      problemId: true,
      submittedAt: true,
      score: true, // 假设 score > 0 代表正确
    },
    orderBy: {
      submittedAt: 'asc', // 按提交时间升序处理
    },
  })

  // 3. 获取所有参赛队伍信息
  const teams = await prisma.team.findMany({
    where: {
      participatingIn: {
        has: competitionId,
      },
    },
    select: {
      id: true,
      name: true,
    },
  })

  // 4. 计算每个队伍的排行榜数据
  const leaderboardMap: Map<string, Omit<TeamLeaderboardEntry, 'rank' | 'team'> & { team: { id: string, name: string } }> = new Map()

  // 初始化所有队伍的数据
  for (const team of teams) {
    leaderboardMap.set(team.id, {
      team: { id: team.id, name: team.name },
      problemsSolved: 0,
      totalPenalty: 0,
      problemStats: problemIds.reduce((acc, id) => {
        acc[id] = { attempts: 0, solved: false, penalty: 0 }
        return acc
      }, {} as TeamLeaderboardEntry['problemStats']),
    })
  }


  // 遍历提交记录进行计算
  for (const submission of submissions) {
    const teamStats = leaderboardMap.get(submission.teamId)
    // 如果提交的队伍不在参赛队伍列表中，则忽略
    if (!teamStats) {
      continue
    }

    const problemStat = teamStats.problemStats[submission.problemId]
    // 如果该问题已经解决，则忽略后续的提交
    if (problemStat?.solved) {
      continue
    }

    problemStat.attempts += 1

    // 假设 score > 0 表示解答正确
    const isCorrect = submission.score && submission.score > 0

    if (isCorrect) {
      problemStat.solved = true
      const timeToSolve = Math.floor((submission.submittedAt.getTime() - competition.startTime.getTime()) / (1000 * 60))
      const penaltyForIncorrect = (problemStat.attempts - 1) * 20
      const problemPenalty = timeToSolve + penaltyForIncorrect

      problemStat.penalty = problemPenalty
      teamStats.problemsSolved += 1
      teamStats.totalPenalty += problemPenalty
    }
  }


  // 5. 排序
  const sortedLeaderboard = Array.from(leaderboardMap.values()).sort((a, b) => {
    // 首先按解题数降序
    if (a.problemsSolved !== b.problemsSolved) {
      return b.problemsSolved - a.problemsSolved
    }
    // 解题数相同，按总罚时升序
    return a.totalPenalty - b.totalPenalty
  })

  // 6. 分配排名
  const finalLeaderboard: TeamLeaderboardEntry[] = sortedLeaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))

  return finalLeaderboard
})
