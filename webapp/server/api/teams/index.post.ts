import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(2).max(50)
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

  const body = await readBody(event)

  try {
    const { name } = createTeamSchema.parse(body)

    // Check if team name is taken
    const nameExists = await prisma.team.findFirst({
      where: { name }
    })

    if (nameExists) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Team name already taken'
      })
    }

    // Create team and add creator as member using transaction
    const team = await prisma.$transaction(async (tx) => {
      // Create the team
      const newTeam = await tx.team.create({
        data: {
          name
        }
      })

      // Create the team membership for the creator
      await tx.teamMembership.create({
        data: {
          teamId: newTeam.id,
          userId: user.id,
          role: 'CREATOR'
        }
      })

      // Fetch the complete team data
      return await tx.team.findUnique({
        where: { id: newTeam.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      })
    })

    return {
      success: true,
      team
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