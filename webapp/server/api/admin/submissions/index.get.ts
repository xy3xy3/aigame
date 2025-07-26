import { defineEventHandler } from 'h3'
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

  const submissions = await prisma.submission.findMany({
    orderBy: {
      submittedAt: 'desc',
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

  return submissions
})