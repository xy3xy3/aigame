import prisma from '../../../../utils/prisma'
import { requireActiveUser } from '../../../../utils/auth'

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

    // 验证用户状态
    requireActiveUser(user)

    const competitionId = getRouterParam(event, 'id')
    if (!competitionId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Competition ID is required'
        })
    }

    try {
        // 获取比赛信息和 CDK 设置
        const competition = await prisma.competition.findUnique({
            where: { id: competitionId },
            select: {
                id: true,
                title: true,
                cdkEnabled: true,
                cdkClaimMode: true,
                cdkPerUnitLimit: true,
                startTime: true,
                endTime: true
            }
        })

        if (!competition) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Competition not found'
            })
        }

        if (!competition.cdkEnabled) {
            return {
                success: true,
                cdkEnabled: false,
                cdks: [],
                stats: {
                    claimed: 0,
                    remaining: 0,
                    limit: 0
                }
            }
        }

        // 查找用户的队伍参与情况
        const teamMember = await prisma.teamMembership.findFirst({
            where: {
                userId: user.id,
                team: {
                    participatingIn: {
                        has: competitionId
                    }
                }
            },
            include: {
                team: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        if (!teamMember) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You are not participating in this competition'
            })
        }

        const teamId = teamMember.team.id

        // 根据领取模式查询 CDK
        let cdks: any[] = []
        let claimedCount = 0

        if (competition.cdkClaimMode === 'TEAM') {
            // 按队伍模式：显示队伍的所有 CDK
            cdks = await prisma.competitionCdk.findMany({
                where: {
                    competitionId,
                    teamId,
                    status: 'CLAIMED'
                },
                select: {
                    id: true,
                    code: true,
                    claimedAt: true,
                    notes: true,
                    claimedByUser: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    claimedAt: 'desc'
                }
            })
            claimedCount = cdks.length
        } else {
            // 按成员模式：只显示用户自己的 CDK
            cdks = await prisma.competitionCdk.findMany({
                where: {
                    competitionId,
                    userId: user.id,
                    status: 'CLAIMED'
                },
                select: {
                    id: true,
                    code: true,
                    claimedAt: true,
                    notes: true
                },
                orderBy: {
                    claimedAt: 'desc'
                }
            })
            claimedCount = cdks.length
        }

        // 获取可用 CDK 总数（用于显示库存）
        const availableCount = await prisma.competitionCdk.count({
            where: {
                competitionId,
                status: 'AVAILABLE'
            }
        })

        const limit = competition.cdkPerUnitLimit || 0
        const remaining = Math.max(0, limit - claimedCount)

        return {
            success: true,
            cdkEnabled: true,
            claimMode: competition.cdkClaimMode,
            cdks,
            stats: {
                claimed: claimedCount,
                remaining,
                limit,
                available: availableCount
            },
            team: competition.cdkClaimMode === 'TEAM' ? teamMember.team : null
        }

    } catch (error: any) {
        // 如果是我们抛出的错误，直接重新抛出
        if (error.statusCode) {
            throw error
        }

        // 处理其他错误
        console.error('Get my CDK error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get CDK information',
            data: error.message
        })
    }
})