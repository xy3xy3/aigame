export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const competitionId = getRouterParam(event, 'id')
  
  const { $prisma } = await usePrisma()
  
  // 验证比赛是否存在
  const competition = await $prisma.competition.findUnique({
    where: { id: competitionId }
  })
  
  if (!competition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Competition not found'
    })
  }
  
  // 获取题目列表
  const problems = await $prisma.problem.findMany({
    where: { competitionId },
    orderBy: {
      startTime: 'asc'
    },
    include: {
      _count: {
        select: {
          submissions: true
        }
      }
    }
  })
  
  // 添加状态信息
  const now = new Date()
  const problemsWithStatus = problems.map(problem => {
    let status = 'upcoming'
    if (problem.startTime <= now && problem.endTime > now) {
      status = 'ongoing'
    } else if (problem.endTime <= now) {
      status = 'ended'
    }
    
    return {
      ...problem,
      status
    }
  })
  
  return {
    success: true,
    problems: problemsWithStatus
  }
})
