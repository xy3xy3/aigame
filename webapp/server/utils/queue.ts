import { Queue, Worker, Job } from 'bullmq'
import { getRedisClient } from './redis'
import prisma from './prisma'

// 评测任务队列
let evaluationQueue: Queue | null = null
let evaluationWorker: Worker | null = null

export interface EvaluationResult {
  success: boolean
  score?: number
  executionLogs?: string
  error?: string
}

export function getEvaluationQueue(): Queue {
  if (!evaluationQueue) {
    const redisConnection = getRedisClient()

    evaluationQueue = new Queue('evaluation', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100, // 保留最近100个完成的任务
        removeOnFail: 50,      // 保留最近50个失败的任务
        attempts: 3,           // 最多重试3次
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })
  }

  return evaluationQueue
}

export async function addEvaluationJob(submissionId: string): Promise<Job> {
  const queue = getEvaluationQueue()

  return await queue.add('evaluate', {
    submissionId
  }, {
    priority: 1,
    delay: 0,
  })
}

export function startEvaluationWorker(): Worker {
  if (evaluationWorker) {
    return evaluationWorker
  }

  const redisConnection = getRedisClient()

  evaluationWorker = new Worker('evaluation', async (job: Job<{ submissionId: string }>) => {
    console.log(`Processing evaluation job ${job.id} for submission ${job.data.submissionId}`)

    try {
      // 更新提交状态为评测中
      await updateSubmissionStatus(job.data.submissionId, 'JUDGING')

      // 执行评测
      const result = await evaluateSubmission(job.data.submissionId)

      // 更新提交结果
      await updateSubmissionResult(job.data.submissionId, result)

      console.log(`Evaluation job ${job.id} completed successfully`)
      return result

    } catch (error) {
      console.error(`Evaluation job ${job.id} failed:`, error)

      // 更新提交状态为错误
      await updateSubmissionStatus(job.data.submissionId, 'ERROR', error.message)

      throw error
    }
  }, {
    connection: redisConnection,
    concurrency: 5, // 同时处理5个评测任务
  })

  evaluationWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })

  evaluationWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })

  return evaluationWorker
}

async function updateSubmissionStatus(submissionId: string, status: string, error?: string): Promise<void> {
  const $prisma = prisma

  const updateData: any = {
    status,
    updatedAt: new Date()
  }

  if (status === 'ERROR' && error) {
    updateData.executionLogs = error
  }

  if (status === 'JUDGING') {
    updateData.judgedAt = new Date()
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: updateData
  })
}

async function updateSubmissionResult(submissionId: string, result: EvaluationResult): Promise<void> {
  const $prisma = prisma

  const updateData: any = {
    status: result.success ? 'COMPLETED' : 'ERROR',
    updatedAt: new Date(),
    judgedAt: new Date()
  }

  if (result.success && result.score !== undefined) {
    updateData.score = result.score
  }

  if (result.executionLogs) {
    updateData.executionLogs = result.executionLogs
  }

  if (!result.success && result.error) {
    updateData.executionLogs = result.error
  }

  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data: updateData,
    include: {
      team: true,
      competition: true
    }
  })

  // 如果评测成功，更新排行榜
  if (result.success && result.score !== undefined) {
    await updateLeaderboardScore(submission.competitionId, submission.teamId, result.score)
  }
}

async function updateLeaderboardScore(competitionId: string, teamId: string, score: number): Promise<void> {
  const { updateLeaderboard } = await import('./redis')

  // 更新Redis排行榜
  await updateLeaderboard(competitionId, teamId, score)

  // 更新数据库排行榜
  const $prisma = prisma

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
  const existingEntry = await prisma.leaderboardEntry.findUnique({
    where: {
      leaderboardId_teamId: {
        leaderboardId: leaderboard.id,
        teamId
      }
    }
  })

  const team = await prisma.team.findUnique({
    where: { id: teamId }
  })

  if (existingEntry) {
    // 更新现有条目（只有更高分数才更新）
    if (score > existingEntry.totalScore) {
      await prisma.leaderboardEntry.update({
        where: { id: existingEntry.id },
        data: {
          totalScore: score,
          // TODO: 更新problemScores
        }
      })
    }
  } else {
    // 创建新条目
    await prisma.leaderboardEntry.create({
      data: {
        leaderboardId: leaderboard.id,
        teamId,
        totalScore: score,
        rank: 1, // 临时值，稍后会重新计算
        problemScores: [] // TODO: 实现题目分数跟踪
      }
    })
  }

  // 重新计算排名
  await recalculateRanks(leaderboard.id)
}

async function recalculateRanks(leaderboardId: string): Promise<void> {
  const $prisma = prisma

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

async function evaluateSubmission(submissionId: string): Promise<EvaluationResult> {
  // 这里是模拟的评测逻辑
  // 在实际应用中，这里会调用外部评测服务或执行评测脚本

  console.log(`Evaluating submission ${submissionId}`)

  // 模拟评测过程（2-5秒）
  const evaluationTime = Math.random() * 3000 + 2000
  await new Promise(resolve => setTimeout(resolve, evaluationTime))

  // 模拟评测结果
  const success = Math.random() > 0.1 // 90% 成功率

  if (success) {
    const score = Math.random() * 100 // 0-100分
    return {
      success: true,
      score: Math.round(score * 100) / 100, // 保留两位小数
      executionLogs: `Evaluation completed successfully.\nScore: ${score}\nExecution time: ${evaluationTime}ms`
    }
  } else {
    return {
      success: false,
      error: 'Evaluation failed: Runtime error or timeout',
      executionLogs: 'Error: Code execution failed\nDetails: Timeout after 30 seconds'
    }
  }
}

// 获取队列状态
export async function getQueueStats() {
  const queue = getEvaluationQueue()

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed()
  ])

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length
  }
}

// 清理队列
export async function cleanQueue() {
  const queue = getEvaluationQueue()

  await queue.clean(24 * 60 * 60 * 1000, 100, 'completed') // 清理24小时前的完成任务
  await queue.clean(24 * 60 * 60 * 1000, 50, 'failed')    // 清理24小时前的失败任务
}
