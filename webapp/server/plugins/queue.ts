// import { startEvaluationWorker } from '../utils/queue'

export default async () => {
  // 在服务器启动时自动启动评测队列工作器
  // 暂时禁用，因为Redis未安装
  console.log('Queue worker disabled - Redis not available')

  // try {
  //   console.log('Starting evaluation worker...')
  //   const worker = startEvaluationWorker()
  //   console.log(`Evaluation worker started with ID: ${worker.id}`)
  // } catch (error) {
  //   console.error('Failed to start evaluation worker:', error)
  // }
}
