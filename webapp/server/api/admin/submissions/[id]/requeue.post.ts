import { z } from 'zod'
import prisma from '../../../../utils/prisma'
import { addEvaluationJob } from '../../../../utils/queue-manager'
import { requireAdminRole } from '~/server/utils/auth'

const requeueParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
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

  const { id } = await getValidatedRouterParams(event, requeueParamsSchema.parse)



  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      problem: true,
    },
  })

  if (!submission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Submission not found',
    })
  }

  // Add the submission back to the queue
  await addEvaluationJob(submission.id)

  // Update the submission status to PENDING
  await prisma.submission.update({
    where: { id },
    data: {
      status: 'PENDING',
      score: null,
      executionLogs: null,
      judgedAt: null,
    },
  })

  return {
    success: true,
    message: 'Submission has been re-queued.',
  }
})