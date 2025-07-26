import prisma from '../../../utils/prisma'
import { invalidateCompetitionCache } from '../../../utils/redis'
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


  const competitionId = getRouterParam(event, 'id')

  if (!competitionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Competition ID is required'
    })
  }

  try {


    // 验证比赛是否存在
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        problems: true,
        submissions: true
      }
    })

    if (!competition) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Competition not found'
      })
    }

    // 检查是否有权限删除（创建者或管理员）
    if (competition.createdBy !== user.id) {
      // TODO: 当添加角色系统后，检查是否为管理员
      throw createError({
        statusCode: 403,
        statusMessage: 'Permission denied. Only the creator can delete this competition.'
      })
    }

    // 检查比赛是否已经开始（可选的安全检查）
    const now = new Date()
    if (competition.startTime <= now && competition.endTime > now) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete an ongoing competition'
      })
    }

    // 删除相关数据（级联删除）
    // 注意：由于Prisma的级联删除配置，相关的problems和submissions会自动删除
    await prisma.competition.delete({
      where: { id: competitionId }
    })

    // 清除缓存
    await invalidateCompetitionCache(competitionId)

    return {
      success: true,
      message: 'Competition deleted successfully'
    }

  } catch (error: any) {
    // 如果是我们抛出的错误，直接重新抛出
    if (error.statusCode) {
      throw error
    }

    // 处理数据库错误
    console.error('Delete competition error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete competition',
      data: error.message
    })
  }
})
