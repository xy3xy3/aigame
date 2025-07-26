import { defineEventHandler, getRouterParam } from 'h3'
import prisma from '../../../../utils/prisma'
import { requireAdminRole } from '../../../../utils/auth'

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

    // Get announcement ID from route parameter
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Announcement ID is required'
        })
    }

    // Get announcement by ID
    const announcement = await prisma.announcement.findUnique({
        where: {
            id
        }
    })

    if (!announcement) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Announcement not found'
        })
    }

    return {
        announcement
    }
})