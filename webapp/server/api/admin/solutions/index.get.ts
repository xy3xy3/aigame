import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import prisma from '../../../utils/prisma'
import { requireAdminRole } from '../../../utils/auth'

const getSolutionsSchema = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    competitionId: z.string().optional(),
    teamId: z.string().optional(),
    search: z.string().optional(),
})

export default defineEventHandler(async (event) => {
    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required'
        })
    }

    // Check admin role
    requireAdminRole(user)

    try {
        // Get query parameters for pagination and filtering
        const query = getQuery(event)
        const { page, limit, competitionId, teamId, search } = getSolutionsSchema.parse(query)

        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)
        const skip = (pageNum - 1) * limitNum

        // Build where clause for filtering
        let whereClause: any = {}

        if (competitionId) {
            whereClause.competitionId = competitionId
        }

        if (teamId) {
            whereClause.teamId = teamId
        }

        if (search) {
            whereClause.OR = [
                {
                    fileName: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ]
        }

        // Get total count
        const total = await prisma.solution.count({
            where: whereClause
        })

        // Get solutions with pagination
        const solutions = await prisma.solution.findMany({
            where: whereClause,
            skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        realName: true,
                    },
                },
                team: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                competition: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        })

        // Calculate pagination info
        const totalPages = Math.ceil(total / limitNum)

        return {
            success: true,
            solutions: solutions.map(solution => ({
                id: solution.id,
                fileName: solution.fileName,
                fileSize: solution.fileSize,
                mimeType: solution.mimeType,
                fileUrl: solution.fileUrl,
                createdAt: solution.createdAt,
                updatedAt: solution.updatedAt,
                user: solution.user,
                team: solution.team,
                competition: solution.competition,
            })),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        }

    } catch (error: any) {
        if (error.name === 'ZodError') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid query parameters',
                data: error.issues
            })
        }

        throw error
    }
})