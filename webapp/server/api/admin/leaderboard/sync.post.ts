import { addLeaderboardSyncJob } from '../../../plugins/leaderboard-sync'
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

  requireAdminRole(user)

  try {
    const body = await readBody(event)
    const { competitionId } = body

    if (!competitionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Competition ID is required'
      })
    }

    // 触发排行榜同步
    await addLeaderboardSyncJob(competitionId)

    return {
      success: true,
      message: `Leaderboard sync job added for competition ${competitionId}`
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add leaderboard sync job',
      data: error.message
    })
  }
})