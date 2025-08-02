import { z } from 'zod'
import prisma from '../../../../utils/prisma'

const getSolutionsSchema = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    teamId: z.string().optional()
})

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

    try {
        const competitionId = getRouterParam(event, 'id')
        if (!competitionId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Competition ID is required'
            })
        }

        // 获取查询参数
        const query = getQuery(event)
        const { page, limit, teamId } = getSolutionsSchema.parse(query)

        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)
        const skip = (pageNum - 1) * limitNum

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

        // 权限控制
        const isAdmin = user.role === 'admin'
        let whereClause: any = {
            competitionId
        }

        // 如果不是管理员，只能看到自己团队的题解
        if (!isAdmin) {
            // 获取用户所属的团队
            const userTeams = await prisma.teamMembership.findMany({
                where: { userId: user.id },
                select: { teamId: true }
            })

            const userTeamIds = userTeams.map(membership => membership.teamId)

            if (userTeamIds.length === 0) {
                // 用户不属于任何团队，返回空结果
                return {
                    success: true,
                    solutions: [],
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: 0,
                        totalPages: 0
                    }
                }
            }

            whereClause.teamId = {
                in: userTeamIds
            }
        }

        // 添加筛选条件
        if (teamId) {
            // 如果指定了teamId，需要验证权限
            if (!isAdmin) {
                // 非管理员只能查看自己团队的题解
                const userTeams = await prisma.teamMembership.findMany({
                    where: { userId: user.id },
                    select: { teamId: true }
                })
                const userTeamIds = userTeams.map(membership => membership.teamId)

                if (!userTeamIds.includes(teamId)) {
                    throw createError({
                        statusCode: 403,
                        statusMessage: 'You do not have permission to view solutions from this team'
                    })
                }
            }
            whereClause.teamId = teamId
        }

        // 获取题解总数
        const total = await prisma.solution.count({
            where: whereClause
        })

        // 获取题解列表
        const solutions = await prisma.solution.findMany({
            where: whereClause,
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
                        username: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limitNum
        })

        const totalPages = Math.ceil(total / limitNum)

        return {
            success: true,
            solutions: solutions.map(solution => ({
                id: solution.id,
                fileName: solution.fileName,
                fileSize: solution.fileSize,
                mimeType: solution.mimeType,
                createdAt: solution.createdAt,
                updatedAt: solution.updatedAt,
                team: solution.team,
                user: solution.user
            })),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        }

    } catch (error: any) {
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid query parameters',
                data: error.issues
            })
        }

        throw error
    }
})