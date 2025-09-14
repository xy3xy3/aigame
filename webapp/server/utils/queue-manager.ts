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

// 获取队列中的任务
export async function getJobs(
  types: ('waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused')[],
  start?: number,
  end?: number,
  asc?: boolean,
) {
  const queue = getEvaluationQueue()
  const jobs = await queue.getJobs(types, start, end, asc)

  return Promise.all(jobs.map(async (job) => ({
    id: job.id,
    name: job.name,
    data: job.data,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    delay: job.delay,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    opts: job.opts,
    state: await job.getState()
  })))
}

// 获取指定类型任务的总数
export async function getJobCount(
  types: ('waiting' | 'active' | 'completed' | 'failed' | 'delayed')[]
) {
  const queue = getEvaluationQueue();

  // 使用 BullMQ 提供的特定状态计数方法以提高效率
  const countPromises = types.map(async (type) => {
    switch (type) {
      case 'waiting':
        return await queue.getWaitingCount();
      case 'active':
        return await queue.getActiveCount();
      case 'completed':
        return await queue.getCompletedCount();
      case 'failed':
        return await queue.getFailedCount();
      case 'delayed':
        return await queue.getDelayedCount();
      default:
        return 0;
    }
  });

  const counts = await Promise.all(countPromises);
  const count = counts.reduce((acc: number, curr: number) => acc + curr, 0);

  return count;
}