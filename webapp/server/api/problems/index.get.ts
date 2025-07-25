import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 10
  const status = query.status as string // 'upcoming', 'ongoing', 'ended'
  const competitionId = query.competitionId as string



  // 构建查询条件
  const where: any = {}
  const now = new Date()

  // 竞赛筛选
  if (competitionId) {
    where.competitionId = competitionId
  }

  // 状态筛选
  if (status === 'upcoming') {
    where.startTime = { gt: now }
  } else if (status === 'ongoing') {
    where.AND = [
      { startTime: { lte: now } },
      { endTime: { gt: now } }
    ]
  } else if (status === 'ended') {
    where.endTime = { lte: now }
  }

  // 获取题目列表
  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      include: {
        competition: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.problem.count({ where })
  ])

  // 添加状态信息
  const problemsWithStatus = problems.map(problem => {
    let problemStatus = 'upcoming'
    if (problem.startTime <= now && problem.endTime > now) {
      problemStatus = 'ongoing'
    } else if (problem.endTime <= now) {
      problemStatus = 'ended'
    }

    return {
      ...problem,
      status: problemStatus
    }
  })

  return {
    success: true,
    problems: problemsWithStatus,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})