import { defineEventHandler, readBody } from 'h3'
import prisma from '../../../utils/prisma'
import { requireAdminRole } from '../../../utils/auth'

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

    // Read body data
    const body = await readBody(event)
    const { title, content, status } = body

    // Validate required fields
    if (!title || !content) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Title and content are required'
        })
    }

    // Create new announcement
    const announcement = await prisma.announcement.create({
        data: {
            title,
            content,
            status: status || 'HIDDEN' // Default to 'HIDDEN' if not provided
        }
    })

    return {
        success: true,
        announcement
    }
})