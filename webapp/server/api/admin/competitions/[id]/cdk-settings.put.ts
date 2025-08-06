import { z } from 'zod'
import prisma from '../../../../utils/prisma'
import { requireAdminRole } from '../../../../utils/auth'

const cdkSettingsSchema = z.object({
    cdkEnabled: z.boolean(),
    cdkClaimMode: z.enum(['TEAM', 'MEMBER']).optional(),
    cdkPerUnitLimit: z.number().int().min(1).max(100).optional()
})

export default defineEventHandler(async (event) => {
    if (event.method !== 'PUT') {
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
        const { cdkEnabled, cdkClaimMode, cdkPerUnitLimit } = cdkSettingsSchema.parse(body)

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

        // 如果启用 CDK，则必须提供领取模式和单位限制
        if (cdkEnabled && (!cdkClaimMode || !cdkPerUnitLimit)) {
            throw createError({
                statusCode: 400,
                statusMessage: 'CDK claim mode and per unit limit are required when CDK is enabled'
            })
        }

        // 更新比赛的 CDK 设置
        const competition = await prisma.competition.update({
            where: { id: competitionId },
            data: {
                cdkEnabled,
                cdkClaimMode: cdkEnabled ? cdkClaimMode : null,
                cdkPerUnitLimit: cdkEnabled ? cdkPerUnitLimit : null
            },
            select: {
                id: true,
                cdkEnabled: true,
                cdkClaimMode: true,
                cdkPerUnitLimit: true
            }
        })

        return {
            success: true,
            competition
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
        console.error('Update CDK settings error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update CDK settings',
            data: error.message
        })
    }
})