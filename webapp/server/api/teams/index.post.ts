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



    // Check if user is already captain of a team
    const existingTeam = await prisma.team.findFirst({
      where: { captainId: user.id }
    })

    if (existingTeam) {
      throw createError({
        statusCode: 409,
        statusMessage: 'You are already a captain of a team'
      })
    }

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

    // Create team and add captain as member
    const team = await prisma.team.create({
      data: {
        name,
        captainId: user.id,
        members: {
          create: {
            userId: user.id
          }
        }
      },
      include: {
        captain: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true
          }
        },
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