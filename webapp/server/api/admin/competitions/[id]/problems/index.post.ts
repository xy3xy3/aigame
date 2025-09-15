import { z } from 'zod'
import prisma from '../../../../../utils/prisma'
import { requireAdminRole } from '../../../../../utils/auth'

const createProblemSchema = z.object({
    title: z.string().min(2).max(100),
    shortDescription: z.string(),
    detailedDescription: z.string(),
    datasetUrl: z.string().url().optional(),
    judgingScriptUrl: z.string().url().optional(),
    sampleSubmissionUrl: z.string().url().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    score: z.number().int().positive().optional()
})

export default defineEventHandler(async (event) => {
    if (event.method !== 'POST') {
        throw createError({
            statusCode: 405,
            statusMessage: '方法不允许'
        })
    }

    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: '需要身份验证'
        })
    }

    const competitionId = getRouterParam(event, 'id')
    if (!competitionId) {
        throw createError({
            statusCode: 400,
            statusMessage: '比赛ID不能为空'
        })
    }
    const body = await readBody(event)

    try {
        const { title, shortDescription, detailedDescription, datasetUrl, judgingScriptUrl, sampleSubmissionUrl, startTime, endTime, score } = createProblemSchema.parse(body)



        // 验证比赛是否存在且用户有权限
        const competition = await prisma.competition.findUnique({
            where: { id: competitionId }
        })

        if (!competition) {
            throw createError({
                statusCode: 404,
                statusMessage: '未找到比赛'
            })
        }

        // Check admin role
        requireAdminRole(user)

        // 验证时间逻辑
        // 确保时间字符串被正确解析为 UTC 时间
        const start = new Date(startTime)
        const end = new Date(endTime)

        // 确保解析后的时间是有效的
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw createError({
                statusCode: 400,
                statusMessage: '无效的时间格式'
            })
        }

        if (start >= end) {
            throw createError({
                statusCode: 400,
                statusMessage: '结束时间必须在开始时间之后'
            })
        }

        // 验证题目时间是否在比赛时间范围内（允许等于比赛的开始和结束时间）
        // 确保在统一的时区下进行比较
        const competitionStart = new Date(competition.startTime)
        const competitionEnd = new Date(competition.endTime)

        if (isNaN(competitionStart.getTime()) || isNaN(competitionEnd.getTime())) {
            throw createError({
                statusCode: 500,
                statusMessage: '比赛时间数据错误'
            })
        }

        if (start < competitionStart || end > competitionEnd) {
            throw createError({
                statusCode: 400,
                statusMessage: `题目时间必须在比赛时间范围内，比赛时间范围是 ${competitionStart.toISOString()} 到 ${competitionEnd.toISOString()}`
            })
        }

        // 检查是否已存在同名题目
        const existingProblem = await prisma.problem.findFirst({
            where: {
                competitionId,
                title
            }
        })

        if (existingProblem) {
            throw createError({
                statusCode: 400,
                statusMessage: '该比赛下已存在同名题目'
            })
        }

        // 创建题目
        const problem = await prisma.problem.create({
            data: {
                title,
                shortDescription,
                detailedDescription,
                competitionId,
                datasetUrl,
                judgingScriptUrl,
                sampleSubmissionUrl,
                startTime: start,
                endTime: end,
                score
            }
        })

        return {
            success: true,
            problem
        }

    } catch (error: any) {
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                statusMessage: '验证失败',
                data: error.issues
            })
        }

        throw error
    }
})
