import { Worker, Job } from 'bullmq'
import { getRedisClient } from '../utils/redis'
import prisma from '../utils/prisma'
import { useRuntimeConfig } from '#imports'

export default async () => {
  // 获取环境变量
  const config = useRuntimeConfig()
  const evaluateAppUrl = config.evaluateAppUrl

  // 创建 Redis 连接
  const redisConnection = getRedisClient()

  // 创建 Worker 来处理 evaluation 队列
  const worker = new Worker('evaluation', async (job: Job<{ submissionId: string }>) => {
    try {
      // 调用 FastAPI 端点
      const response = await $fetch(`${evaluateAppUrl}/evaluate`, {
        method: 'POST',
        body: {
          submission_id: job.data.submissionId
        }
      })

      console.log(`Successfully evaluated submission ${job.data.submissionId}`, response)
      return response
    } catch (error: any) {
      console.error(`Failed to evaluate submission ${job.data.submissionId}:`, error)

      // 如果调用失败，将数据库中对应 submissionId 的记录状态更新为 "ERROR"
      await prisma.submission.update({
        where: { id: job.data.submissionId },
        data: {
          status: 'ERROR',
          executionLogs: error.message || 'Unknown error occurred during evaluation'
        }
      })

      // 重新抛出错误，让队列知道任务失败了
      throw error
    }
  }, {
    connection: redisConnection,
    concurrency: 5 // 同时处理5个任务
  })

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })

  console.log('Evaluation worker started')
}
