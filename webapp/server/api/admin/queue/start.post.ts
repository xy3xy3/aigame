import { startEvaluationWorker } from '../../../utils/queue'
import { requireAdminRole } from '../../../utils/auth'

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

  // Check admin role
  requireAdminRole(user)

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
