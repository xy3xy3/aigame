import { getQueueStats } from '../../../utils/queue'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
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

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  try {
    const stats = await getQueueStats()

    return {
      success: true,
      stats
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get queue stats',
      data: error.message
    })
  }
})
