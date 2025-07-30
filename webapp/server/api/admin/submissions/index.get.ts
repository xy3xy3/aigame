import { defineEventHandler, getQuery } from 'h3'
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

  // Get query parameters for pagination
  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 10
  const skip = (page - 1) * limit

  // Get total count
  const total = await prisma.submission.count()

  // Get submissions with pagination
  const submissions = await prisma.submission.findMany({
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      problem: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit)

  return {
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  }
})