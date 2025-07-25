export default defineEventHandler(async (event) => {
  if (event.method !== 'DELETE') {
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

  const teamId = getRouterParam(event, 'id')

  try {
    const { $prisma } = await usePrisma()

    // Get team and verify user is captain
    const team = await $prisma.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Team not found'
      })
    }

    if (team.captainId !== user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: '只有队长可以解散队伍'
      })
    }

    if (team.isLocked) {
      throw createError({
        statusCode: 403,
        statusMessage: '无法修改已锁定的队伍'
      })
    }

    // Delete team
    await $prisma.$transaction(async (prisma) => {
      // Delete all related data
      await prisma.teamMember.deleteMany({
        where: { teamId }
      })
      await prisma.invitation.deleteMany({
        where: { teamId }
      })
      await prisma.submission.deleteMany({
        where: { teamId }
      })
      await prisma.leaderboardEntry.deleteMany({
        where: { teamId }
      })

      // Delete team
      await prisma.team.delete({
        where: { id: teamId }
      })
    })

    return { success: true }
  } catch (error) {
    throw error
  }
})