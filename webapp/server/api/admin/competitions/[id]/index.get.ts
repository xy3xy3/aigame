import prisma from '../../../../utils/prisma'
import { requireAdminRole } from '../../../../utils/auth'

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
        // 获取竞赛信息
        const competition = await prisma.competition.findUnique({
            where: { id: competitionId },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                problems: true,
                _count: {
                    select: {
                        submissions: true,
                        solutions: true,
                        cdks: true
                    }
                }
            }
        })

        if (!competition) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Competition not found'
            })
        }

        return {
            success: true,
            competition
        }

    } catch (error: any) {
        // 如果是我们抛出的错误，直接重新抛出
        if (error.statusCode) {
            throw error
        }

        // 处理其他错误
        console.error('Get competition error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get competition',
            data: error.message
        })
    }
})