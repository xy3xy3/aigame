import prisma from '../../../../../utils/prisma'
import { requireAdminRole } from '../../../../../utils/auth'

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

    // 验证管理员权限
    requireAdminRole(user)

    const competitionId = getRouterParam(event, 'id')
    if (!competitionId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Competition ID is required'
        })
    }

    try {
        // 验证比赛是否存在
        const existingCompetition = await prisma.competition.findUnique({
            where: { id: competitionId }
        })

        if (!existingCompetition) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Competition not found'
            })
        }

        const query = getQuery(event)
        const page = parseInt(query.page as string) || 1
        const limit = Math.min(parseInt(query.limit as string) || 20, 100) // 最大100条
        const status = query.status as string // 'AVAILABLE', 'CLAIMED', 'VOID'
        const batchId = query.batchId as string
        const search = query.search as string // 搜索 CDK 代码

        // 构建查询条件
        const where: any = {
            competitionId
        }

        if (status && ['AVAILABLE', 'CLAIMED', 'VOID'].includes(status)) {
            where.status = status
        }

        if (batchId) {
            where.batchId = batchId
        }

        if (search) {
            where.code = {
                contains: search,
                mode: 'insensitive'
            }
        }

        // 获取 CDK 列表和总数
        const [cdks, total] = await Promise.all([
            prisma.competitionCdk.findMany({
                where,
                include: {
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
                    },
                    claimedByUser: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.competitionCdk.count({ where })
        ])

        // 获取统计信息
        const stats = await prisma.competitionCdk.groupBy({
            by: ['status'],
            where: {
                competitionId
            },
            _count: {
                status: true
            }
        })

        const statusCounts = stats.reduce((acc: any, stat: any) => {
            acc[stat.status] = stat._count.status
            return acc
        }, {} as Record<string, number>)

        // 获取批次信息
        const batches = await prisma.competitionCdk.findMany({
            where: {
                competitionId,
                batchId: { not: null }
            },
            select: {
                batchId: true,
                createdAt: true
            },
            distinct: ['batchId'],
            orderBy: {
                createdAt: 'desc'
            }
        })

        return {
            success: true,
            cdks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            stats: {
                available: statusCounts.AVAILABLE || 0,
                claimed: statusCounts.CLAIMED || 0,
                void: statusCounts.VOID || 0,
                total: Object.values(statusCounts).reduce((sum: number, count: any) => sum + (count as number), 0)
            },
            batches: batches.map((b: any) => ({
                id: b.batchId,
                createdAt: b.createdAt
            }))
        }

    } catch (error: any) {
        // 如果是我们抛出的错误，直接重新抛出
        if (error.statusCode) {
            throw error
        }

        // 处理其他错误
        console.error('Get CDK list error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get CDK list',
            data: error.message
        })
    }
})