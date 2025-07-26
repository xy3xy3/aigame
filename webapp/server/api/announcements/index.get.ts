import { defineEventHandler } from 'h3'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    // Get visible announcements ordered by creation date (newest first)
    const announcements = await prisma.announcement.findMany({
        where: {
            status: 'VISIBLE'
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return {
        announcements
    }
})