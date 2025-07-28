import { Queue, Job } from 'bullmq'
import { getRedisClient } from './redis'

// 统一的队列管理器
let evaluationQueue: Queue | null = null

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

// 添加评测任务到队列
export async function addEvaluationJob(submissionId: string): Promise<Job> {
  const queue = getEvaluationQueue()

  return await queue.add('evaluate', {
    submissionId
  }, {
    priority: 1,
    delay: 0,
  })
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