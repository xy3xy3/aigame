import prisma from '../../../utils/prisma'
import { invalidateProblemCache } from '../../../utils/redis'
import { requireAdminRole } from '../../../utils/auth'

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

  // 检查是否有相关的提交记录
  if (problem._count.submissions > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot delete problem with existing submissions'
    })
  }

  try {
    // 删除题目
    await prisma.problem.delete({
      where: { id: problemId }
    })

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