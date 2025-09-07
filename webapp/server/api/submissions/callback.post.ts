import { z } from 'zod'
import prisma from '../../utils/prisma'

const callbackSchema = z.object({
  submissionId: z.string(),
  status: z.enum(['COMPLETED', 'ERROR']),
  score: z.number(),
  logs: z.string(),
})

// 导入排行榜更新函数
async function updateLeaderboardScore(competitionId: string, teamId: string, problemId: string, score: number, submissionId: string): Promise<void> {
  // 查找或创建排行榜
  let leaderboard = await prisma.leaderboard.findUnique({
    where: { competitionId }
  })

  if (!leaderboard) {
    leaderboard = await prisma.leaderboard.create({
      data: { competitionId }
    })
  }

  // 查找或创建排行榜条目
  let leaderboardEntry = await prisma.leaderboardEntry.findUnique({
    where: {
      leaderboardId_teamId: {
        leaderboardId: leaderboard.id,
        teamId
      }
    },
    include: {
      problemScores: true
    }
  })

  if (!leaderboardEntry) {
    // 创建新条目
    leaderboardEntry = await prisma.leaderboardEntry.create({
      data: {
        leaderboardId: leaderboard.id,
        teamId,
        totalScore: 0,
        rank: 1, // 临时值，稍后会重新计算
      },
      include: {
        problemScores: true
      }
    })
  }

  // 查找或创建题目得分记录
  const existingProblemScore = await prisma.problemScore.findFirst({
    where: {
      leaderboardEntryId: leaderboardEntry.id,
      problemId: problemId
    }
  })

  if (existingProblemScore) {
    // 只有更高分数才更新
    if (score > existingProblemScore.score) {
      await prisma.problemScore.update({
        where: { id: existingProblemScore.id },
        data: {
          score: score,
          createdAt: new Date(),
          bestSubmissionId: submissionId
        }
      })
    }
  } else {
    // 创建新的题目得分记录
    await prisma.problemScore.create({
      data: {
        problemId: problemId,
        score: score,
        createdAt: new Date(),
        bestSubmissionId: submissionId,
        leaderboardEntryId: leaderboardEntry.id
      }
    })
  }

  // 重新计算该队伍的总分
  const teamProblemScores = await prisma.problemScore.findMany({
    where: {
      leaderboardEntryId: leaderboardEntry.id
    }
  })

  const newTotalScore = teamProblemScores.reduce((sum, ps) => sum + ps.score, 0)

  // 更新排行榜条目的总分
  await prisma.leaderboardEntry.update({
    where: { id: leaderboardEntry.id },
    data: {
      totalScore: newTotalScore
    }
  })

  // 重新计算排名
  await recalculateRanks(leaderboard.id)
}

// 重新计算排名
async function recalculateRanks(leaderboardId: string): Promise<void> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { leaderboardId },
    orderBy: { totalScore: 'desc' }
  })

  for (let i = 0; i < entries.length; i++) {
    await prisma.leaderboardEntry.update({
      where: { id: entries[i].id },
      data: { rank: i + 1 }
    })
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // 1. 安全检查：验证共享密钥
  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Missing or invalid authorization header',
    })
  }

  const authToken = authHeader.split(' ')[1]
  if (authToken !== config.evaluateAppSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid callback secret',
    })
  }

  // 2. 解析和验证请求体
  const body = await readBody(event)
  const validation = callbackSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: validation.error.errors,
    })
  }

  const { submissionId, status, score, logs } = validation.data

  // 3. 更新数据库
  try {
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status,
        score,
        logs,
        judgedAt: new Date(),
      },
      include: {
        team: true,
        competition: true
      }
    })
    
    console.log(`[Callback] Successfully updated submission ${submissionId} with status: ${status}, score: ${score}`)

    // 4. 如果评测成功，更新排行榜
    if (status === 'COMPLETED' && score !== null && score !== undefined) {
      await updateLeaderboardScore(
        updatedSubmission.competitionId,
        updatedSubmission.teamId,
        updatedSubmission.problemId,
        score,
        updatedSubmission.id
      )
      
      console.log(`[Callback] Updated leaderboard for submission ${submissionId}`)
    }

    return { success: true, submissionId: updatedSubmission.id }
  } catch (error) {
    console.error(`[Callback] Failed to update submission ${submissionId}:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update submission in database',
    })
  }
})