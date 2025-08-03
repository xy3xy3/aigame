import { z } from 'zod'
import prisma from '../../../../utils/prisma'
import { invalidateCompetitionCache } from '../../../../utils/redis'
import { requireAdminRole } from '../../../../utils/auth'

// 提取横幅URL的相对路径部分
function extractBannerPath(bannerUrl: string | undefined): string | undefined {
    if (!bannerUrl) return undefined

    // 如果是完整URL，提取相对路径部分
    if (bannerUrl.startsWith('http://') || bannerUrl.startsWith('https://')) {
        // 匹配格式：http://localhost:9000/banners/some-image.webp
        const match = bannerUrl.match(/\/banners\/(.+)$/)
        if (match) {
            // 检查匹配的部分是否还是一个完整URL（防止URL累积）
            const potentialFileName = match[1];
            if (potentialFileName.startsWith('http://') || potentialFileName.startsWith('https://')) {
                // 如果还是URL，递归处理直到得到真正的文件名
                return extractBannerPath(potentialFileName);
            }
            return potentialFileName; // 返回文件名部分，如 "some-image.webp"
        }
        // 如果无法解析，返回原值
        return bannerUrl
    }

    // 如果已经是相对路径，直接返回
    return bannerUrl
}

const updateCompetitionSchema = z.object({
    title: z.string().min(2).max(100),
    description: z.string().max(2000),
    rules: z.string().max(5000),
    bannerUrl: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    solutionSubmissionDeadlineDays: z.number().int().min(0).max(30).optional()
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

    const competitionId = getRouterParam(event, 'id')

    if (!competitionId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Competition ID is required'
        })
    }

    const body = await readBody(event)

    try {
        const { title, description, rules, bannerUrl: rawBannerUrl, startTime, endTime, solutionSubmissionDeadlineDays } = updateCompetitionSchema.parse(body)

        // 处理横幅URL，确保保存的是相对路径
        const bannerUrl = extractBannerPath(rawBannerUrl)

        // 验证时间逻辑
        // 确保时间字符串被正确解析为 UTC 时间
        const start = new Date(startTime)
        const end = new Date(endTime)

        // 确保解析后的时间是有效的
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid time format'
            })
        }

        if (start >= end) {
            throw createError({
                statusCode: 400,
                statusMessage: 'End time must be after start time'
            })
        }



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


        // 检查权限（只有创建者或管理员可以编辑）
        if (existingCompetition.createdBy !== user.id) {
            // Check admin role
            requireAdminRole(user)
        }
        // 检查是否有同名比赛（排除当前比赛）
        const duplicateCompetition = await prisma.competition.findFirst({
            where: {
                title,
                id: { not: competitionId }
            }
        })

        if (duplicateCompetition) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Competition with this title already exists'
            })
        }

        // 更新比赛
        const competition = await prisma.competition.update({
            where: { id: competitionId },
            data: {
                title,
                description,
                rules,
                bannerUrl,
                startTime: start,
                endTime: end,
                ...(solutionSubmissionDeadlineDays !== undefined && { solutionSubmissionDeadlineDays })
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                problems: true
            }
        })

        // 清除缓存
        await invalidateCompetitionCache(competitionId)

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
        console.error('Update competition error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update competition',
            data: error.message
        })
    }
})