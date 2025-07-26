import prisma from '../../utils/prisma'
import { processTeamData } from '../../utils/url'

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
      statusMessage: '需要登录认证'
    })
  }



  // Get teams where user is a member
  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: user.id
        }
      }
    },
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

  // 处理团队数据，包括头像URL
  const processedTeams = teams.map(team => processTeamData(team))

  return {
    success: true,
    teams: processedTeams
  }
})