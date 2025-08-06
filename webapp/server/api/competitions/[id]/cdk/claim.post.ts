import prisma from '../../../../utils/prisma'
import { requireActiveUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    if (event.method !== 'POST') {
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
        // 使用事务确保原子性
        const result = await prisma.$transaction(async (tx) => {
            // 获取比赛信息和 CDK 设置
            const competition = await tx.competition.findUnique({
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
                throw createError({
                    statusCode: 400,
                    statusMessage: 'CDK claiming is not enabled for this competition'
                })
            }

            if (!competition.cdkClaimMode || !competition.cdkPerUnitLimit) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'CDK settings are not properly configured'
                })
            }

            // 检查比赛时间（可选：只在比赛期间允许领取）
            const now = new Date()
            if (now < competition.startTime) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Competition has not started yet'
                })
            }

            // 查找用户的队伍参与情况
            const teamMember = await tx.teamMembership.findFirst({
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

            // 根据领取模式检查已领取数量
            let claimedCount = 0
            const whereCondition: any = {
                competitionId,
                status: 'CLAIMED'
            }

            if (competition.cdkClaimMode === 'TEAM') {
                // 按队伍模式：检查该队伍已领取的数量
                whereCondition.teamId = teamId
            } else {
                // 按成员模式：检查该用户已领取的数量
                whereCondition.userId = user.id
            }

            claimedCount = await tx.competitionCdk.count({
                where: whereCondition
            })

            if (claimedCount >= competition.cdkPerUnitLimit) {
                throw createError({
                    statusCode: 400,
                    statusMessage: competition.cdkClaimMode === 'TEAM'
                        ? 'Your team has reached the CDK claim limit'
                        : 'You have reached the CDK claim limit'
                })
            }

            // 查找一个可用的 CDK（使用 FOR UPDATE 锁定以防并发）
            const availableCdk = await tx.competitionCdk.findFirst({
                where: {
                    competitionId,
                    status: 'AVAILABLE'
                },
                orderBy: {
                    createdAt: 'asc' // 先进先出
                }
            })

            if (!availableCdk) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'No CDK codes available for claiming'
                })
            }

            // 更新 CDK 记录为已领取
            const claimedCdk = await tx.competitionCdk.update({
                where: {
                    id: availableCdk.id
                },
                data: {
                    status: 'CLAIMED',
                    claimedAt: new Date(),
                    claimedByUserId: user.id,
                    ...(competition.cdkClaimMode === 'TEAM'
                        ? { teamId }
                        : { userId: user.id }
                    )
                },
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
                    }
                }
            })

            return {
                cdk: claimedCdk,
                claimMode: competition.cdkClaimMode,
                remainingClaims: competition.cdkPerUnitLimit - claimedCount - 1
            }
        })

        return {
            success: true,
            ...result
        }

    } catch (error: any) {
        // 如果是我们抛出的错误，直接重新抛出
        if (error.statusCode) {
            throw error
        }

        // 处理 Prisma 并发错误
        if (error.code === 'P2025') {
            throw createError({
                statusCode: 400,
                statusMessage: 'CDK code was claimed by another user, please try again'
            })
        }

        // 处理其他错误
        console.error('Claim CDK error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to claim CDK code',
            data: error.message
        })
    }
})