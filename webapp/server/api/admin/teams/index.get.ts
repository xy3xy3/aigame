import prisma from '../../../utils/prisma'
import { requireAdminRole } from '../../../utils/auth'

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

  requireAdminRole(user)



  // 获取查询参数
  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 10
  const search = query.search as string || ''

  // 计算跳过的记录数
  const skip = (page - 1) * limit

  // 构建查询条件
  const where: any = {}
  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive'
    }
  }

  // 获取队伍总数
  const total = await prisma.team.count({ where })

  // 获取队伍列表
  const teams = await prisma.team.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      }
    }
  })

  // 计算总页数
  const totalPages = Math.ceil(total / limit)

  return {
    success: true,
    teams: teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      avatarUrl: team.avatarUrl,
      isLocked: team.isLocked,
      creator: team.members.find(member => member.role === 'CREATOR')?.user || null,
      memberCount: team.members.length,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  }
})