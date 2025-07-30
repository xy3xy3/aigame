import { Queue, Worker, Job } from 'bullmq'
import { getRedisClient, updateLeaderboard } from '../utils/redis'
import prisma from '../utils/prisma'

// 排行榜同步队列
let leaderboardSyncQueue: Queue | null = null
let leaderboardSyncWorker: Worker | null = null

export function getLeaderboardSyncQueue(): Queue {
  if (!leaderboardSyncQueue) {
    const redisConnection = getRedisClient()

    leaderboardSyncQueue = new Queue('leaderboard-sync', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    })
  }

  return leaderboardSyncQueue
}

// 添加排行榜同步任务
export async function addLeaderboardSyncJob(competitionId: string): Promise<Job> {
  const queue = getLeaderboardSyncQueue()

  return await queue.add('sync-leaderboard', {
    competitionId
  }, {
    priority: 1,
    delay: 0,
    // 避免重复任务
    jobId: `sync-${competitionId}`,
  })
}

// 添加定期同步任务
export async function schedulePeriodicLeaderboardSync(): Promise<void> {
  const queue = getLeaderboardSyncQueue()

  // 每5分钟执行一次全量同步
  await queue.add('periodic-sync', {}, {
    repeat: { pattern: '*/5 * * * *' }, // cron: 每5分钟
    jobId: 'periodic-leaderboard-sync',
  })
}

export default async () => {
  // 获取环境变量
  const redisConnection = getRedisClient()

  // 创建 Worker 来处理排行榜同步队列
  leaderboardSyncWorker = new Worker('leaderboard-sync', async (job: Job) => {
    try {
      if (job.name === 'sync-leaderboard') {
        // 单个比赛的排行榜同步
        const { competitionId } = job.data
        await syncCompetitionLeaderboard(competitionId)
        console.log(`Successfully synced leaderboard for competition ${competitionId}`)
      } else if (job.name === 'periodic-sync') {
        // 全量排行榜同步
        await syncAllLeaderboards()
        console.log('Successfully synced all leaderboards')
      }

      return { success: true }
    } catch (error: any) {
      console.error(`Failed to sync leaderboard:`, error)
      throw error
    }
  }, {
    connection: redisConnection,
    concurrency: 2, // 同时处理2个同步任务
  })

  leaderboardSyncWorker.on('completed', (job) => {
    console.log(`Leaderboard sync job ${job.id} completed`)
  })

  leaderboardSyncWorker.on('failed', (job, err) => {
    console.error(`Leaderboard sync job ${job?.id} failed:`, err)
  })

  // 启动定期同步
  await schedulePeriodicLeaderboardSync()

  console.log('Leaderboard sync worker started')
}

// 同步单个比赛的排行榜
async function syncCompetitionLeaderboard(competitionId: string): Promise<void> {
  // 1. 从数据库获取该比赛的所有已完成提交
  const submissions = await prisma.submission.findMany({
    where: {
      competitionId,
      status: 'COMPLETED',
      score: { not: null },
    },
    select: {
      id: true,
      teamId: true,
      problemId: true,
      score: true,
      createdAt: true,
    },
    orderBy: [
      { teamId: 'asc' },
      { problemId: 'asc' },
      { score: 'desc' },
      { createdAt: 'asc' }
    ],
  })

  // 2. 计算每个团队在每个题目上的最高分和最佳提交
  const teamProblemBest = new Map<string, Map<string, { score: number, submissionId: string, createdAt: Date }>>()

  for (const submission of submissions) {
    const teamKey = submission.teamId
    const problemKey = submission.problemId

    if (!teamProblemBest.has(teamKey)) {
      teamProblemBest.set(teamKey, new Map())
    }

    const teamMap = teamProblemBest.get(teamKey)!
    const currentBest = teamMap.get(problemKey)

    if (!currentBest || submission.score! > currentBest.score) {
      teamMap.set(problemKey, {
        score: submission.score!,
        submissionId: submission.id,
        createdAt: submission.createdAt
      })
    }
  }

  // 3. 计算每个团队的总分
  const teamTotalScores = new Map<string, number>()
  for (const [teamId, problemMap] of teamProblemBest) {
    let totalScore = 0
    for (const [, best] of problemMap) {
      totalScore += best.score
    }
    teamTotalScores.set(teamId, totalScore)
  }

  // 4. 更新Redis排行榜
  for (const [teamId, totalScore] of teamTotalScores) {
    await updateLeaderboard(competitionId, teamId, totalScore)
  }

  // 5. 更新数据库排行榜
  let leaderboard = await prisma.leaderboard.findUnique({
    where: { competitionId }
  })

  if (!leaderboard) {
    leaderboard = await prisma.leaderboard.create({
      data: { competitionId }
    })
  }

  // 删除现有条目并重新创建（确保数据一致性）
  await prisma.leaderboardEntry.deleteMany({
    where: { leaderboardId: leaderboard.id }
  })

  // 按总分排序创建新条目
  const sortedTeams = Array.from(teamTotalScores.entries())
    .sort((a, b) => b[1] - a[1]) // 按分数降序

  for (let i = 0; i < sortedTeams.length; i++) {
    const [teamId, totalScore] = sortedTeams[i]

    // 创建排行榜条目
    const leaderboardEntry = await prisma.leaderboardEntry.create({
      data: {
        leaderboardId: leaderboard.id,
        teamId,
        totalScore: totalScore,
        rank: i + 1,
      }
    })

    // 创建该队伍的题目得分记录
    const teamProblemMap = teamProblemBest.get(teamId)
    if (teamProblemMap) {
      for (const [problemId, best] of teamProblemMap) {
        await prisma.problemScore.create({
          data: {
            problemId: problemId,
            score: best.score,
            createdAt: best.createdAt,
            bestSubmissionId: best.submissionId,
            leaderboardEntryId: leaderboardEntry.id
          }
        })
      }
    }
  }
}

// 同步所有比赛的排行榜
async function syncAllLeaderboards(): Promise<void> {
  // 获取所有活跃的比赛
  const competitions = await prisma.competition.findMany({
    where: {
      endTime: { gte: new Date() }, // 只同步未结束的比赛
    },
    select: { id: true }
  })

  // 逐个同步
  for (const competition of competitions) {
    try {
      await syncCompetitionLeaderboard(competition.id)
    } catch (error) {
      console.error(`Failed to sync leaderboard for competition ${competition.id}:`, error)
    }
  }
}