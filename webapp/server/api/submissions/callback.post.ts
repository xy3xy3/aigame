import { z } from 'zod'
import prisma from '../../utils/prisma'
import { cancelEvaluationTimeoutJob } from '../../utils/queue-manager'
import { SubmissionStatus } from '@prisma/client'
import crypto from 'crypto'

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

  // 1. 验证签名头
  const tsHeader = getHeader(event, 'x-timestamp')
  const signHeader = getHeader(event, 'x-sign')
  const providedContentHash = getHeader(event, 'x-content-hash')
  if (!tsHeader || !signHeader) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Missing signature headers' })
  }
  const tsNum = parseInt(tsHeader)
  if (!tsNum || Math.abs(Date.now() / 1000 - tsNum) > 600) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Signature expired' })
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

  // 2.1 获取内容哈希：优先使用客户端提供的 X-Content-Hash，兼容不同语言的浮点格式差异
  let contentHash = providedContentHash || ''
  if (!contentHash) {
    function canonicalize(obj: any): string {
      if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
      if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']'
      const keys = Object.keys(obj).sort()
      return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}'
    }
    const payloadStr = canonicalize({ submissionId, status, score, logs })
    contentHash = crypto.createHash('sha256').update(payloadStr).digest('hex')
  }

  // 2.2 获取候选密钥：优先提交关联节点，其次所有激活节点，最后环境变量回退
  const candidateSecrets: string[] = []
  const submissionRecord = await prisma.submission.findUnique({ where: { id: submissionId }, select: { evaluateNodeId: true } })
  if (submissionRecord?.evaluateNodeId) {
    const node = await prisma.evaluateNode.findUnique({ where: { id: submissionRecord.evaluateNodeId }, select: { sharedSecret: true } })
    if (node?.sharedSecret) candidateSecrets.push(node.sharedSecret)
  } else {
    const nodes = await prisma.evaluateNode.findMany({ where: { active: true }, select: { sharedSecret: true } })
    for (const n of nodes) if (n.sharedSecret) candidateSecrets.push(n.sharedSecret)
  }
  if ((config as any).evaluateAppSecret) candidateSecrets.push((config as any).evaluateAppSecret as string)

  const valid = candidateSecrets.some(secret => {
    const expected = crypto.createHmac('sha256', secret).update(`${tsHeader}\n${contentHash}`).digest('hex')
    return expected === signHeader
  })
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Invalid signature' })
  }

  // 3. 更新数据库
  try {
    // 签名通过，无需回填节点（如需，也可通过 submission.evaluateNodeId 已有记录）

    const updateResult = await prisma.submission.updateMany({
      where: { id: submissionId },
      data: { status, score, executionLogs: logs, judgedAt: new Date() },
    })

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

    // 取消超时检查任务（若存在）
    try { await cancelEvaluationTimeoutJob(submissionId) } catch {}

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
