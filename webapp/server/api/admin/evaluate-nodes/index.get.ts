import prisma from '~/server/utils/prisma'
import { requireAdminRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  requireAdminRole(user)

  try {
    const nodes = await prisma.evaluateNode.findMany({
      orderBy: { updatedAt: 'desc' }
    })
    return { success: true, data: nodes }
  } catch (err) {
    console.error('Failed to list evaluate nodes:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to list evaluate nodes' })
  }
})

