import { usePrisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: '需要管理员权限'
    })
  }

  const { $prisma } = await usePrisma()

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
  const total = await $prisma.team.count({ where })

  // 获取队伍列表
  const teams = await $prisma.team.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      captain: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      members: true
    }
  })

  // 计算总页数
  const totalPages = Math.ceil(total / limit)

  return {
    success: true,
    teams: teams.map(team => ({
      id: team.id,
      name: team.name,
      captain: {
        id: team.captain.id,
        username: team.captain.username
      },
      memberCount: team.members.length,
      createdAt: team.createdAt
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  }
})