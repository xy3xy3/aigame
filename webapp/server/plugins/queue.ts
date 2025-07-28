import { Worker, Job } from 'bullmq'
import { getRedisClient } from '../utils/redis'
import prisma from '../utils/prisma'
import { useRuntimeConfig } from '#imports'
import { downloadFile } from '../utils/minio'
import { ofetch } from 'ofetch'

// 解析完整的 MinIO URL，提取存储桶名称和对象路径
function parseMinioUrl(url: string): { bucketName: string, objectName: string } {
  // 使用 URL 构造函数解析完整的 URL
  const parsedUrl = new URL(url);
  // 获取路径部分，例如 "/aigame/submissions/path/to/file.zip"
  const pathname = parsedUrl.pathname;
  // 移除开头的斜杠并按斜杠分割
  const parts = pathname.substring(1).split('/');
  // 第一个部分是存储桶名称
  const bucketName = parts[0];
  // 剩余部分是对象路径
  const objectName = parts.slice(1).join('/');
  return { bucketName, objectName };
}

export default async () => {
  // 获取环境变量
  const config = useRuntimeConfig()
  const evaluateAppUrl = config.evaluateAppUrl

  // 创建 Redis 连接
  const redisConnection = getRedisClient()

  // 创建 Worker 来处理 evaluation 队列
  const worker = new Worker('evaluation', async (job: Job<{ submissionId: string }>) => {
    try {
      // 1. 从数据库中获取 submission 和关联的 problem 的详细信息
      const submission = await prisma.submission.findUnique({
        where: { id: job.data.submissionId },
        include: {
          problem: true
        }
      })

      if (!submission) {
        throw new Error(`Submission with ID ${job.data.submissionId} not found`)
      }

      if (!submission.problem) {
        throw new Error(`Problem for submission ${job.data.submissionId} not found`)
      }

      // 2. 使用 MinIO 客户端下载两个文件
      // 解析 submission 文件路径
      const submissionPath = submission.submissionUrl
      // 预处理 submissionPath，确保它是绝对 URL
      const processedSubmissionPath = submissionPath.startsWith('http')
        ? submissionPath
        : `http://${config.minioEndpoint}:${config.minioPort}/${submissionPath}`
      const { bucketName: submissionBucket, objectName: submissionObject } = parseMinioUrl(processedSubmissionPath)

      // 解析 judge script 文件路径
      const judgeScriptPath = submission.problem.judgingScriptUrl
      if (!judgeScriptPath) {
        throw new Error(`Judge script path for problem ${submission.problem.id} is missing`)
      }
      // 预处理 judgeScriptPath，确保它是绝对 URL
      const processedJudgeScriptPath = judgeScriptPath.startsWith('http')
        ? judgeScriptPath
        : `http://${config.minioEndpoint}:${config.minioPort}/${judgeScriptPath}`
      const { bucketName: judgeBucket, objectName: judgeObject } = parseMinioUrl(processedJudgeScriptPath)

      // 下载文件
      const submissionFileBuffer = await downloadFile(submissionBucket, submissionObject)
      const judgeFileBuffer = await downloadFile(judgeBucket, judgeObject)

      // 3. 将这两个文件打包到一个 FormData 对象中
      const formData = new FormData()
      formData.append('submission_file', new Blob([submissionFileBuffer]), submissionObject)
      formData.append('judge_file', new Blob([judgeFileBuffer]), judgeObject)

      // 4. 发送到新的 evaluateapp API 端点
      const response = await ofetch(`${evaluateAppUrl}/api/evaluate`, {
        method: 'POST',
        body: formData
      })

      console.log(`Successfully evaluated submission ${job.data.submissionId}`, response)

      // 5. 将返回的评测结果更新到数据库中对应的 submission 记录
      await prisma.submission.update({
        where: { id: job.data.submissionId },
        data: {
          status: response.status === 'COMPLETED' ? 'COMPLETED' : 'ERROR',
          score: response.score,
          executionLogs: response.logs,
          judgedAt: new Date()
        }
      })

      return response
    } catch (error: any) {
      console.error(`Failed to evaluate submission ${job.data.submissionId}:`, error)

      // 如果调用失败，将数据库中对应 submissionId 的记录状态更新为 "ERROR"
      await prisma.submission.update({
        where: { id: job.data.submissionId },
        data: {
          status: 'ERROR',
          executionLogs: error.message || 'Unknown error occurred during evaluation',
          judgedAt: new Date()
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
