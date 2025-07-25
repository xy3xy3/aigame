import { z } from 'zod'
import { usePrisma } from '../../../../utils/prisma'
import { addEvaluationJob } from '~/server/utils/queue'

const requeueParamsSchema = z.object({
  id: z.string().cuid(),
})

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, requeueParamsSchema.parse)

  const { $prisma } = await usePrisma()

  const submission = await $prisma.submission.findUnique({
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
  await addEvaluationJob({
    submissionId: submission.id,
    problemId: submission.problemId,
    competitionId: submission.competitionId,
    teamId: submission.teamId,
    userId: submission.userId,
    submissionUrl: submission.submissionUrl,
  })

  // Update the submission status to PENDING
  await $prisma.submission.update({
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