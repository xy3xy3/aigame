import prisma from '../../utils/prisma'

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

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 10
  const problemId = query.problemId as string
  const competitionId = query.competitionId as string
  const teamId = query.teamId as string
  const status = query.status as string



  // 构建查询条件
  const where: any = {}

  // 如果指定了特定筛选条件
  if (problemId) where.problemId = problemId
  if (competitionId) where.competitionId = competitionId
  if (teamId) where.teamId = teamId
  if (status) where.status = status

  // 如果没有指定teamId，则只显示用户所在队伍的提交
  if (!teamId) {
    const userTeams = await prisma.teamMember.findMany({
      where: { userId: user.id },
      select: { teamId: true }
    })

    const teamIds = userTeams.map(tm => tm.teamId)

    if (teamIds.length > 0) {
      where.teamId = { in: teamIds }
    } else {
      // 用户不属于任何队伍，返回空结果
      return {
        success: true,
        submissions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      }
    }
  } else {
    // 验证用户是否属于指定队伍
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: user.id
      }
    })

    if (!teamMember) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You are not a member of this team'
      })
    }
  }

  // 获取提交列表
  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            shortDescription: true
          }
        },
        competition: {
          select: {
            id: true,
            title: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.submission.count({ where })
  ])

  return {
    success: true,
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
