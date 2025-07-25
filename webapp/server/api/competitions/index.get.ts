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

  // 获取用户信息（如果已登录）
  const user = event.context.user



  // 构建查询条件
  const where: any = {}
  const now = new Date()

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

  // 获取比赛列表
  const [competitions, total] = await Promise.all([
    prisma.competition.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        problems: {
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
        startTime: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.competition.count({ where })
  ])

  // 获取用户参加的比赛信息（如果已登录）
  let userParticipatingCompetitions: string[] = []
  if (user) {
    const userTeams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      },
      select: {
        participatingIn: true
      }
    })

    // 收集所有用户队伍参加的比赛ID
    userParticipatingCompetitions = userTeams.flatMap(team => team.participatingIn)
  }

  // 添加状态信息和参赛状态
  const competitionsWithStatus = competitions.map(competition => {
    let competitionStatus = 'upcoming'
    if (competition.startTime <= now && competition.endTime > now) {
      competitionStatus = 'ongoing'
    } else if (competition.endTime <= now) {
      competitionStatus = 'ended'
    }

    return {
      ...competition,
      status: competitionStatus,
      userParticipating: userParticipatingCompetitions.includes(competition.id)
    }
  })

  return {
    success: true,
    competitions: competitionsWithStatus,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
