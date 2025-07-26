import prisma from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
    if (event.method !== 'GET') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed'
        })
    }

    const competitionId = getRouterParam(event, 'id')
    const { page = '1', limit = '10' } = getQuery(event)

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)

    // 验证比赛是否存在
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId }
    })

    if (!competition) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Competition not found'
        })
    }

    const totalProblems = await prisma.problem.count({
        where: { competitionId }
    })

    // 获取题目列表
    const problems = await prisma.problem.findMany({
        where: { competitionId },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: {
            startTime: 'asc'
        },
        select: {
            id: true,
            title: true,
            shortDescription: true,
            startTime: true,
            endTime: true,
            score: true,
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
        problems: problemsWithStatus,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalProblems,
            totalPages: Math.ceil(totalProblems / limitNum)
        }
    }
})