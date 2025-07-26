import { z } from 'zod'

const removeMemberSchema = z.object({
  userId: z.string()
})

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
  const body = await readBody(event)

  try {
    const { userId } = removeMemberSchema.parse(body)



    // Get team and verify user is creator
    const teamWithMembership = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true
      }
    })

    if (!teamWithMembership) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Team not found'
      })
    }

    // Check if user is the creator of the team
    const userMembership = teamWithMembership.members.find(member => member.userId === user.id);
    if (!userMembership || userMembership.role !== 'CREATOR') {
      throw createError({
        statusCode: 403,
        statusMessage: '只有队长可以移除成员'
      })
    }

    const team = teamWithMembership;

    if (team.isLocked) {
      throw createError({
        statusCode: 403,
        statusMessage: '无法修改已锁定的队伍'
      })
    }

    // Cannot remove creator
    const memberToRemove = team.members.find(member => member.userId === userId);
    if (memberToRemove && memberToRemove.role === 'CREATOR') {
      throw createError({
        statusCode: 400,
        statusMessage: '不能移除队长'
      })
    }

    // Remove member
    await prisma.teamMembership.delete({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId
        }
      }
    })

    return {
      success: true,
      message: '成功移除成员'
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: error.issues
      })
    }

    throw error
  }
})