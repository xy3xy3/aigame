import { z } from 'zod'
import prisma from '../../utils/prisma'
import { SubmissionStatus } from '@prisma/client'

// Zod v3 中，为原始类型（string, number）提供自定义错误消息的正确方式
// 并且解决 nativeEnum 的弃用警告 (虽然它仍然是与 Prisma 枚举配合使用的最直接方式)
const callbackSchema = z.object({
  submissionId: z.string({
    required_error: "字段 'submissionId' 是必需的。",
    invalid_type_error: "字段 'submissionId' 必须是一个字符串。",
  }).min(1, "字段 'submissionId' 不能为空。"),

  // @ts-ignore - z.nativeEnum 在 Zod v3 中配合 Prisma 枚举工作得很好，暂时忽略弃用警告
  status: z.nativeEnum(SubmissionStatus, {
    errorMap: () => ({ message: "字段 'status' 的值必须是 'COMPLETED' 或 'ERROR'。" }),
  }),

  score: z.number({
    required_error: "字段 'score' 是必需的。",
    invalid_type_error: "字段 'score' 必须是一个数字。",
  }),

  logs: z.string().optional(),
})

// ...排行榜更新函数（保持不变）...
async function updateLeaderboardScore(competitionId: string, teamId: string, problemId: string, score: number, submissionId: string): Promise<void> {
  let leaderboard = await prisma.leaderboard.findUnique({ where: { competitionId } });
  if (!leaderboard) {
    leaderboard = await prisma.leaderboard.create({ data: { competitionId } });
  }

  let leaderboardEntry = await prisma.leaderboardEntry.findUnique({
    where: { leaderboardId_teamId: { leaderboardId: leaderboard.id, teamId } },
    include: { problemScores: true }
  });

  if (!leaderboardEntry) {
    leaderboardEntry = await prisma.leaderboardEntry.create({
      data: { leaderboardId: leaderboard.id, teamId, totalScore: 0, rank: 0 },
      include: { problemScores: true }
    });
  }

  const existingProblemScore = await prisma.problemScore.findFirst({
    where: { leaderboardEntryId: leaderboardEntry.id, problemId: problemId }
  });

  if (existingProblemScore) {
    if (score > existingProblemScore.score) {
      await prisma.problemScore.update({
        where: { id: existingProblemScore.id },
        data: { score, createdAt: new Date(), bestSubmissionId: submissionId }
      });
    }
  } else {
    await prisma.problemScore.create({
      data: { problemId, score, createdAt: new Date(), bestSubmissionId: submissionId, leaderboardEntryId: leaderboardEntry.id }
    });
  }

  const teamProblemScores = await prisma.problemScore.findMany({ where: { leaderboardEntryId: leaderboardEntry.id } });
  const newTotalScore = teamProblemScores.reduce((sum, ps) => sum + ps.score, 0);

  await prisma.leaderboardEntry.update({
    where: { id: leaderboardEntry.id },
    data: { totalScore: newTotalScore }
  });

  await recalculateRanks(leaderboard.id);
}

async function recalculateRanks(leaderboardId: string): Promise<void> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { leaderboardId },
    orderBy: [{ totalScore: 'desc' }, { id: 'asc' }]
  });

  for (let i = 0; i < entries.length; i++) {
    await prisma.leaderboardEntry.update({
      where: { id: entries[i].id },
      data: { rank: i + 1 }
    });
  }
}


export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // 1. 安全检查
  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Missing or invalid authorization header' })
  }
  const authToken = authHeader.split(' ')[1]
  if (authToken !== config.evaluateAppSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Invalid callback secret' })
  }

  // 2. 解析和验证请求体
  const body = await readBody(event)
  const validation = callbackSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的请求体',
      data: validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  const { submissionId, status, score, logs } = validation.data

  // 3. 更新数据库
  try {
    const updateResult = await prisma.submission.updateMany({
      where: { id: submissionId },
      data: { status, score, executionLogs: logs, judgedAt: new Date() },
    });

    if (updateResult.count === 0) {
      console.warn(`[Callback] 更新警告：未找到 Submission ID 为 ${submissionId} 的记录，可能已被删除。`);
      return { success: true, message: `Submission with ID ${submissionId} not found, but callback acknowledged.` };
    }

    const updatedSubmission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, competitionId: true, teamId: true, problemId: true }
    });

    if (!updatedSubmission) {
      console.error(`[Callback] 致命错误：更新成功但无法重新查询到 Submission ID ${submissionId}`);
      return { success: true, message: 'Updated submission could not be retrieved after update.' };
    }

    console.log(`[Callback] Successfully updated submission ${submissionId} with status: ${status}, score: ${score}`)

    // 4. 更新排行榜
    if (status === 'COMPLETED' && score !== null) {
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
    console.error(`[Callback] 处理 Submission ID ${submissionId} 时发生数据库错误:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: '处理回调时发生内部数据库错误',
    })
  }
})