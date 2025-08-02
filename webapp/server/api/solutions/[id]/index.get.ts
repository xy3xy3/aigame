import { z } from 'zod'
import prisma from '../../../utils/prisma'
import { getPublicFileUrl } from '../../../utils/minio'

const getSolutionSchema = z.object({
    id: z.string()
})

export default defineEventHandler(async (event) => {
    if (event.method !== 'GET') {
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

    try {
        const solutionId = getRouterParam(event, 'id')
        if (!solutionId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Solution ID is required'
            })
        }

        // 验证ID格式
        getSolutionSchema.parse({ id: solutionId })

        // 获取题解详情
        const solution = await prisma.solution.findUnique({
            where: { id: solutionId },
            include: {
                team: {
                    select: {
                        id: true,
                        name: true,
                        members: {
                            select: {
                                userId: true,
                                role: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
                    }
                },
                competition: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        })

        if (!solution) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Solution not found'
            })
        }

        // 权限控制：只有题解所属团队成员和管理员可以访问
        const isAdmin = user.role === 'admin'
        const isTeamMember = solution.team.members.some(member => member.userId === user.id)

        if (!isAdmin && !isTeamMember) {
            throw createError({
                statusCode: 403,
                statusMessage: 'You do not have permission to access this solution'
            })
        }

        // 生成文件下载URL
        let downloadUrl = null
        try {
            // 从 fileUrl 中提取 bucket 和 object name
            const urlParts = solution.fileUrl.split('/')
            const bucketName = urlParts[0]
            const objectName = urlParts.slice(1).join('/')

            downloadUrl = getPublicFileUrl(bucketName, objectName)
        } catch (error) {
            console.error('Error generating download URL:', error)
            // 如果生成URL失败，不抛出错误，只是不提供下载链接
        }

        return {
            success: true,
            solution: {
                id: solution.id,
                fileName: solution.fileName,
                fileSize: solution.fileSize,
                mimeType: solution.mimeType,
                downloadUrl,
                createdAt: solution.createdAt,
                updatedAt: solution.updatedAt,
                team: {
                    id: solution.team.id,
                    name: solution.team.name
                },
                user: solution.user,
                competition: solution.competition
            }
        }

    } catch (error: any) {
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid solution ID format',
                data: error.issues
            })
        }

        throw error
    }
})