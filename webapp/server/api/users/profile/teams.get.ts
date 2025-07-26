import prisma from '../../../utils/prisma'
import { processTeamData } from '../../../utils/url'

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



  // 获取用户创建的团队
  const createdTeams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: user.id,
          role: 'CREATOR'
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

  // 获取用户加入的团队
  const joinedTeams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: user.id,
          role: 'MEMBER'
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
  const processedCreatedTeams = createdTeams.map(processTeamData)
  const processedJoinedTeams = joinedTeams.map(processTeamData)

  return {
    success: true,
    createdTeams: processedCreatedTeams,
    joinedTeams: processedJoinedTeams
  }
})