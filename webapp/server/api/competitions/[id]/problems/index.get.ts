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

    // 计算当前登录用户所在参赛队伍在每个题目的最高得分
    const user = event.context.user
    let userBestScoresMap: Record<string, number> = {}
    if (user) {
        // 找到用户在该比赛中参赛的队伍（按约定应至多一个）
        const team = await prisma.team.findFirst({
            where: {
                members: { some: { userId: user.id } },
                participatingIn: { has: competitionId }
            },
            select: { id: true }
        })

        if (team && problems.length > 0) {
            const problemIds = problems.map(p => p.id)
            // 拉取该队伍在这些题目的所有已完成提交分数，聚合为每题最高分
            const submissions = await prisma.submission.findMany({
                where: {
                    teamId: team.id,
                    competitionId,
                    problemId: { in: problemIds },
                    status: 'COMPLETED'
                },
                select: { problemId: true, score: true }
            })

            for (const s of submissions) {
                if (typeof s.score !== 'number') continue
                const prev = userBestScoresMap[s.problemId]
                userBestScoresMap[s.problemId] = Math.max(prev ?? -Infinity, s.score)
            }
        }
    }

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
            status,
            // 前端用于进度条的用户队伍最高得分（若无则为0）
            userBestScore: userBestScoresMap[problem.id] ?? 0
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
