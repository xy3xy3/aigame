import { z } from 'zod'
import prisma from '../../../../../utils/prisma'
import { requireAdminRole } from '../../../../../utils/auth'

const bulkVoidSchema = z.object({
    cdkIds: z.array(z.string()).min(1).max(1000), // 最多一次作废1000个
    reason: z.string().max(500).optional()
})

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

    // 验证管理员权限
    requireAdminRole(user)

    const competitionId = getRouterParam(event, 'id')
    if (!competitionId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Competition ID is required'
        })
    }

    const body = await readBody(event)

    try {
        const { cdkIds, reason } = bulkVoidSchema.parse(body)

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

        // 验证所有 CDK 都属于该比赛
        const cdkCount = await prisma.competitionCdk.count({
            where: {
                id: { in: cdkIds },
                competitionId
            }
        })

        if (cdkCount !== cdkIds.length) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Some CDK codes do not belong to this competition'
            })
        }

        // 批量更新状态为作废
        const result = await prisma.competitionCdk.updateMany({
            where: {
                id: { in: cdkIds },
                competitionId
            },
            data: {
                status: 'VOID',
                notes: reason ? `Voided: ${reason}` : 'Voided by admin'
            }
        })

        return {
            success: true,
            voided: result.count
        }

    } catch (error: any) {
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation failed',
                data: error.issues
            })
        }

        // 如果是我们抛出的错误，直接重新抛出
        if (error.statusCode) {
            throw error
        }

        // 处理其他错误
        console.error('Bulk void CDK error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to void CDK codes',
            data: error.message
        })
    }
})