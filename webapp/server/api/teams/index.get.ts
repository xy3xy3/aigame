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

  const { $prisma } = await usePrisma()
  
  // Get teams where user is a member
  const teams = await $prisma.team.findMany({
    where: {
      members: {
        some: {
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
    teams
  }
})