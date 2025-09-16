import prisma from '~/server/utils/prisma'
import { requireAdminRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  requireAdminRole(user)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing node id' })
  }

  try {
    await prisma.evaluateNode.delete({ where: { id } })
    return { success: true }
  } catch (err) {
    console.error('Failed to delete evaluate node:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete evaluate node' })
  }
})

