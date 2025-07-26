import prisma from '../../../../utils/prisma'
import { processTeamData } from '../../../../utils/url'

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
            statusMessage: '需要登录认证'
        })
    }

    const competitionId = getRouterParam(event, 'id')
    if (!competitionId) {
        throw createError({
            statusCode: 400,
            statusMessage: '比赛ID不能为空'
        })
    }

    // 验证比赛是否存在
    const competition = await prisma.competition.findUnique({
        where: { id: competitionId }
    })

    if (!competition) {
        throw createError({
            statusCode: 404,
            statusMessage: '比赛不存在'
        })
    }

    // 查询用户所属的且已报名参加指定比赛的团队
    const participatingTeams = await prisma.team.findMany({
        where: {
            members: {
                some: {
                    userId: user.id
                }
            },
            participatingIn: {
                has: competitionId
            }
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                }
            }
        }
    })

    // 处理团队数据，包括头像URL
    const processedTeams = participatingTeams.map(team => processTeamData(team))

    return {
        success: true,
        teams: processedTeams
    }
})