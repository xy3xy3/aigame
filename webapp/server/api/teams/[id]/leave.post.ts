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

  const teamId = getRouterParam(event, 'id')

  try {
    // Get team and verify user is a member
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true
      }
    })

    if (!team) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Team not found'
      })
    }

    if (team.isLocked) {
      throw createError({
        statusCode: 403,
        statusMessage: '无法修改已锁定的队伍'
      })
    }

    const isMember = team.members.some(member => member.userId === user.id)
    if (!isMember) {
      throw createError({
        statusCode: 403,
        statusMessage: '你不是该队伍的成员'
      })
    }

    // Use transaction to handle membership removal and potential team deletion
    await prisma.$transaction(async (tx) => {
      // Remove user from team
      await tx.teamMembership.delete({
        where: {
          teamId_userId: {
            teamId: team.id,
            userId: user.id
          }
        }
      })

      // Check if this was the last member and delete team if so
      const remainingMembers = await tx.teamMembership.count({
        where: {
          teamId: team.id
        }
      })

      if (remainingMembers === 0) {
        await tx.team.delete({
          where: {
            id: team.id
          }
        })
      }
    })

    return { success: true }
  } catch (error) {
    throw error
  }
})