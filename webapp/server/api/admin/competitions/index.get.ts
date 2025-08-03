import prisma from '../../../utils/prisma'
import { processBannerUrl } from '../../../utils/url'
import { requireAdminRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    if (event.method !== 'GET') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed'
        })
    }

    // 验证管理员权限
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required'
        })
    }

    // Check admin role
    requireAdminRole(user)

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const status = query.status as string // 'upcoming', 'ongoing', 'ended'

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

    // 获取比赛列表（管理员版本包含更多信息）
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
                        endTime: true,
                        datasetUrl: true,
                        judgingScriptUrl: true
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
        prisma.competition.count({ where })
    ])

    // 添加状态信息
    const competitionsWithStatus = competitions.map(competition => {
        let competitionStatus = 'upcoming'
        if (competition.startTime <= now && competition.endTime > now) {
            competitionStatus = 'ongoing'
        } else if (competition.endTime <= now) {
            competitionStatus = 'ended'
        }

        return {
            ...competition,
            bannerUrl: processBannerUrl(competition.bannerUrl),
            status: competitionStatus
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