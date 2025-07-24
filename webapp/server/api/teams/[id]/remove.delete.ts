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
        statusMessage: 'Only team captain can remove members'
      })
    }
    
    if (team.isLocked) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Cannot modify locked team'
      })
    }
    
    // Cannot remove captain
    if (userId === team.captainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot remove team captain'
      })
    }
    
    // Remove member
    const deletedMember = await $prisma.teamMember.deleteMany({
      where: {
        teamId: team.id,
        userId: userId
      }
    })
    
    if (deletedMember.count === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Member not found in team'
      })
    }
    
    return {
      success: true,
      message: 'Member removed successfully'
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