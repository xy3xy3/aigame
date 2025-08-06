import { z } from 'zod'
import prisma from '../../../../../utils/prisma'
import { requireAdminRole } from '../../../../../utils/auth'

const bulkDeleteSchema = z.object({
    cdkIds: z.array(z.string()).min(1).max(1000), // 最多一次删除1000个
    force: z.boolean().optional() // 是否强制删除（包括已领取的）
})

export default defineEventHandler(async (event) => {
    if (event.method !== 'DELETE') {
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
        const { cdkIds, force = false } = bulkDeleteSchema.parse(body)

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

        // 构建删除条件
        const deleteWhere: any = {
            id: { in: cdkIds },
            competitionId
        }

        // 如果不是强制删除，只删除未领取的 CDK
        if (!force) {
            deleteWhere.status = { in: ['AVAILABLE', 'VOID'] }
        }

        // 验证要删除的 CDK 数量
        const cdkCount = await prisma.competitionCdk.count({
            where: deleteWhere
        })

        if (cdkCount === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: force
                    ? 'No CDK codes found to delete'
                    : 'No unclaimed CDK codes found to delete. Use force=true to delete claimed codes.'
            })
        }

        // 如果不是强制删除，检查是否有已领取的 CDK
        if (!force) {
            const claimedCount = await prisma.competitionCdk.count({
                where: {
                    id: { in: cdkIds },
                    competitionId,
                    status: 'CLAIMED'
                }
            })

            if (claimedCount > 0) {
                return {
                    success: false,
                    message: `Cannot delete ${claimedCount} claimed CDK codes. Use force=true to delete them.`,
                    claimedCount,
                    availableForDeletion: cdkCount
                }
            }
        }

        // 执行删除
        const result = await prisma.competitionCdk.deleteMany({
            where: deleteWhere
        })

        return {
            success: true,
            deleted: result.count,
            forced: force
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
        console.error('Bulk delete CDK error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to delete CDK codes',
            data: error.message
        })
    }
})