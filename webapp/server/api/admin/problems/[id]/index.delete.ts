import prisma from '../../../../utils/prisma'
import { invalidateProblemCache } from '../../../../utils/redis'
import { requireAdminRole } from '../../../../utils/auth'

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

    // Check admin role
    requireAdminRole(user)

    const problemId = getRouterParam(event, 'id')
    if (!problemId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Problem ID is required'
        })
    }



    // 验证题目是否存在
    const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        include: {
            _count: {
                select: {
                    submissions: true
                }
            }
        }
    })

    if (!problem) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Problem not found'
        })
    }

    try {
        // 级联清理：先删除与该题目关联的 ProblemScore，再依赖 Prisma 关系自动级联删除 Submission 记录
        // LeaderboardEntry 不直接依赖 Problem，但其下的 ProblemScore 已被清理，从而不会残留该题目的得分
        await prisma.$transaction([
            prisma.problemScore.deleteMany({ where: { problemId: problemId } }),
            prisma.problem.delete({ where: { id: problemId } })
        ])

        // 清除缓存
        try {
            await invalidateProblemCache(problemId)
        } catch (error) {
            console.log('Redis not available, skipping cache invalidation')
        }

        return {
            success: true,
            message: 'Problem deleted successfully'
        }
    } catch (error) {
        console.error('Delete problem error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to delete problem'
        })
    }
})
