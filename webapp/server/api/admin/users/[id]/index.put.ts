import { defineEventHandler, getRouterParam, readBody } from 'h3'
import prisma from '../../../../utils/prisma'
import { requireAdminRole, hashPassword, excludePassword } from '../../../../utils/auth'

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

    // 获取用户ID
    const id = getRouterParam(event, 'id')
    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'User ID is required'
        })
    }

    // 读取请求体
    const body = await readBody(event)
    const { realName, email, phoneNumber, studentId, education, role, password } = body

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
        where: {
            id
        }
    })

    if (!existingUser) {
        throw createError({
            statusCode: 404,
            statusMessage: 'User not found'
        })
    }

    // 验证邮箱格式（如果提供了邮箱）
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid email format'
            })
        }

        // 检查邮箱是否已被其他用户使用
        const emailExists = await prisma.user.findFirst({
            where: {
                email,
                id: { not: id }
            }
        })

        if (emailExists) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Email already in use by another user'
            })
        }
    }

    // 检查学号是否已被其他用户使用（如果提供了学号）
    if (studentId) {
        const studentIdExists = await prisma.user.findFirst({
            where: {
                studentId,
                id: { not: id }
            }
        })

        if (studentIdExists) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Student ID already in use by another user'
            })
        }
    }

    // 准备更新数据
    const updateData: any = {}

    if (realName !== undefined) updateData.realName = realName
    if (email !== undefined) updateData.email = email
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber
    if (studentId !== undefined) updateData.studentId = studentId
    if (education !== undefined) updateData.education = education
    if (role !== undefined) updateData.role = role

    // 如果提供了密码，则进行哈希处理
    if (password) {
        updateData.passwordHash = await hashPassword(password)
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
        where: {
            id
        },
        data: updateData
    })

    // 返回更新后的用户信息（不包含密码）
    const safeUser = excludePassword(updatedUser)

    return {
        success: true,
        user: safeUser
    }
})