import { defineEventHandler } from 'h3'
import { usePrisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  // TODO: Add admin role check
  const { $prisma } = await usePrisma()
  const submissions = await $prisma.submission.findMany({
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