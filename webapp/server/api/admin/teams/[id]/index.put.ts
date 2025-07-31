import { defineEventHandler, getRouterParam, readBody } from 'h3'
import prisma from '../../../../utils/prisma'
import { requireAdminRole } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    // 检查用户是否已登录
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required'
        })
    }

    // 检查管理员权限
    requireAdminRole(user)

    // 获取队伍ID
    const id = getRouterParam(event, 'id')
    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Team ID is required'
        })
    }

    // 读取请求体
    const body = await readBody(event)
    const { name, description, avatarUrl, isLocked } = body

    // 检查队伍是否存在
    const existingTeam = await prisma.team.findUnique({
        where: {
            id
        }
    })

    if (!existingTeam) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Team not found'
        })
    }

    // 验证队伍名称不为空
    if (name !== undefined && name.trim() === '') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Team name cannot be empty'
        })
    }

    // 检查队伍名称是否已被其他队伍使用（如果提供了新的名称）
    if (name && name !== existingTeam.name) {
        const nameExists = await prisma.team.findFirst({
            where: {
                name,
                id: { not: id }
            }
        })

        if (nameExists) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Team name already in use by another team'
            })
        }
    }

    // 准备更新数据
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (isLocked !== undefined) updateData.isLocked = isLocked

    // 更新队伍信息
    const updatedTeam = await prisma.team.update({
        where: {
            id
        },
        data: updateData,
        include: {
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
        team: {
            id: updatedTeam.id,
            name: updatedTeam.name,
            description: updatedTeam.description,
            avatarUrl: updatedTeam.avatarUrl,
            isLocked: updatedTeam.isLocked,
            creator: updatedTeam.members.find(member => member.role === 'CREATOR')?.user || null,
            memberCount: updatedTeam.members.length,
            createdAt: updatedTeam.createdAt,
            updatedAt: updatedTeam.updatedAt
        }
    }
})