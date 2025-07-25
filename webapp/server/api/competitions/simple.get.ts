import { usePrisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const { $prisma } = await usePrisma()

  // 获取所有竞赛的简化信息，用于筛选器
  const competitions = await $prisma.competition.findMany({
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return {
    success: true,
    competitions
  }
})