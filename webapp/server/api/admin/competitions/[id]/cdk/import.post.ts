import { z } from 'zod'
import prisma from '../../../../../utils/prisma'
import { requireAdminRole } from '../../../../../utils/auth'

const importCdkSchema = z.object({
    codes: z.string().min(1).max(50000), // 支持粘贴大量 CDK
    batchId: z.string().optional(),
    notes: z.string().max(500).optional()
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
        const { codes, batchId, notes } = importCdkSchema.parse(body)

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

        // 解析 CDK 代码（按行分割，去除空行和重复）
        const codeLines = codes
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)

        if (codeLines.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No valid CDK codes provided'
            })
        }

        // 去重
        const uniqueCodes = Array.from(new Set(codeLines))

        // 生成批次ID（如果没有提供）
        const finalBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // 检查是否有重复的 CDK 代码（在数据库中）
        const existingCodes = await prisma.competitionCdk.findMany({
            where: {
                code: {
                    in: uniqueCodes
                }
            },
            select: {
                code: true
            }
        })

        const existingCodeSet = new Set(existingCodes.map((c: any) => c.code))
        const newCodes = uniqueCodes.filter(code => !existingCodeSet.has(code))

        if (newCodes.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'All CDK codes already exist in the database'
            })
        }

        // 批量创建 CDK 记录
        const cdkRecords = newCodes.map(code => ({
            competitionId,
            code,
            status: 'AVAILABLE' as const,
            batchId: finalBatchId,
            notes
        }))

        const result = await prisma.competitionCdk.createMany({
            data: cdkRecords
        })

        return {
            success: true,
            imported: {
                total: uniqueCodes.length,
                successful: result.count,
                duplicates: uniqueCodes.length - newCodes.length,
                batchId: finalBatchId
            }
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
        console.error('Import CDK error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to import CDK codes',
            data: error.message
        })
    }
})