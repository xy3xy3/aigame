import prisma from '../../../utils/prisma'

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

  const submissionId = getRouterParam(event, 'id')



  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      problem: {
        select: {
          id: true,
          title: true,
          shortDescription: true,
          detailedDescription: true
        }
      },
      competition: {
        select: {
          id: true,
          title: true
        }
      },
      team: {
        select: {
          id: true,
          name: true
        }
      },
      user: {
        select: {
          id: true,
          username: true
        }
      }
    }
  })

  if (!submission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission not found'
    })
  }

  // 验证用户是否有权限查看此提交
  const teamMember = await prisma.teamMembership.findFirst({
    where: {
      teamId: submission.teamId,
      userId: user.id
    }
  })

  if (!teamMember) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to view this submission'
    })
  }

  return {
    success: true,
    submission
  }
})
