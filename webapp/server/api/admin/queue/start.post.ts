import { startEvaluationWorker } from '../../../utils/queue'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // TODO: 添加管理员权限检查
  // if (user.role !== 'admin') {
  //   throw createError({
  //     statusCode: 403,
  //     statusMessage: 'Admin access required'
  //   })
  // }

  try {
    const worker = startEvaluationWorker()
    
    return {
      success: true,
      message: 'Evaluation worker started successfully',
      workerId: worker.id
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to start evaluation worker',
      data: error.message
    })
  }
})
