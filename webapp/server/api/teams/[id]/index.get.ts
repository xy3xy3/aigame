import { usePrisma } from '../../../utils/prisma'

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

  const teamId = getRouterParam(event, 'id')

  const { $prisma } = await usePrisma()

  const team = await $prisma.team.findUnique({
    where: { id: teamId },
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

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team not found'
    })
  }

  // Check if user is a member of this team
  const isMember = team.members.some(member => member.userId === user.id)
  if (!isMember) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You are not a member of this team'
    })
  }

  return {
    success: true,
    team
  }
})