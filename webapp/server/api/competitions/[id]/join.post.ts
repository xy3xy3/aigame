import { z } from 'zod'
import { usePrisma } from '../../../utils/prisma'

const joinCompetitionSchema = z.object({
  teamId: z.string()
})

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: '不支持的请求方法'
    })
  }

  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '需要登录认证'
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
    const { teamId } = joinCompetitionSchema.parse(body)

    const { $prisma } = await usePrisma()

    // 验证比赛是否存在且正在进行
    const competition = await $prisma.competition.findUnique({
      where: { id: competitionId }
    })

    if (!competition) {
      throw createError({
        statusCode: 404,
        statusMessage: '比赛不存在'
      })
    }

    const now = new Date()
    if (competition.startTime > now) {
      throw createError({
        statusCode: 400,
        statusMessage: '比赛尚未开始'
      })
    }

    if (competition.endTime <= now) {
      throw createError({
        statusCode: 400,
        statusMessage: '比赛已结束'
      })
    }

    // 验证队伍是否存在且用户是队伍成员
    const team = await $prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    })

    if (!team) {
      throw createError({
        statusCode: 404,
        statusMessage: '队伍不存在'
      })
    }

    // 检查用户是否是队伍成员
    const isMember = team.members.some(member => member.userId === user.id)
    if (!isMember) {
      throw createError({
        statusCode: 403,
        statusMessage: '您不是该队伍的成员'
      })
    }

    // 检查队伍是否已被锁定
    if (team.isLocked) {
      throw createError({
        statusCode: 400,
        statusMessage: '队伍已被锁定，无法参加新的比赛'
      })
    }

    // 获取队伍所有成员的 ID
    const memberIds = team.members.map(member => member.userId)

    // 检查是否有任何成员已经通过任何队伍参加了这个比赛
    const existingParticipantTeam = await $prisma.team.findFirst({
      where: {
        participatingIn: {
          has: competitionId
        },
        members: {
          some: {
            userId: {
              in: memberIds
            }
          }
        }
      }
    })

    if (existingParticipantTeam) {
      throw createError({
        statusCode: 400,
        statusMessage: '队伍中已有成员报名参加此比赛，无法重复报名'
      })
    }

    // 更新队伍信息：添加比赛ID到participatingIn数组，并锁定队伍
    const updatedTeam = await $prisma.team.update({
      where: { id: teamId },
      data: {
        participatingIn: {
          push: competitionId
        },
        isLocked: true
      },
      include: {
        captain: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      }
    })

    return {
      success: true,
      message: '成功参加比赛！队伍已被锁定。',
      team: updatedTeam
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '请求参数验证失败',
        data: error.issues
      })
    }

    throw error
  }
})
