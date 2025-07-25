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


    // Get team and verify user is a member but not the captain
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

    if (team.captainId === user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: '队长不能退出队伍，只能解散队伍'
      })
    }

    // Remove user from team
    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: user.id
        }
      }
    })

    return { success: true }
  } catch (error) {
    throw error
  }
})