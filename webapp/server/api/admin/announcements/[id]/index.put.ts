import { defineEventHandler, getRouterParam, readBody } from 'h3'
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

    // Read body data
    const body = await readBody(event)
    const { title, content, status } = body

    // Check if announcement exists
    const existingAnnouncement = await prisma.announcement.findUnique({
        where: {
            id
        }
    })

    if (!existingAnnouncement) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Announcement not found'
        })
    }

    // Update announcement
    const announcement = await prisma.announcement.update({
        where: {
            id
        },
        data: {
            title: title || existingAnnouncement.title,
            content: content || existingAnnouncement.content,
            status: status || existingAnnouncement.status
        }
    })

    return {
        success: true,
        announcement
    }
})