import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email()
})

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
  const body = await readBody(event)

  try {
    const { email } = inviteSchema.parse(body)

    const { $prisma } = await usePrisma()

    // Get team and verify user is captain
    const team = await $prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
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
        statusMessage: '只有队长可以邀请成员'
      })
    }

    if (team.isLocked) {
      throw createError({
        statusCode: 403,
        statusMessage: '无法修改已锁定的队伍'
      })
    }

    // Find user to invite
    const userToInvite = await $prisma.user.findUnique({
      where: { email }
    })

    if (!userToInvite) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Check if user is already a member
    const existingMember = team.members.find(member => member.userId === userToInvite.id)
    if (existingMember) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User is already a team member'
      })
    }

    // Check if user is already in another team for any active competitions
    // For now, we'll allow users to be in multiple teams

    // Add member to team
    await $prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: userToInvite.id
      }
    })

    return {
      success: true,
      message: `Successfully invited ${userToInvite.username} to the team`
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