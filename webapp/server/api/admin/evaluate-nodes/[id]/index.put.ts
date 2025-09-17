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

  const body = await readBody(event)
  const { name, baseUrl, sharedSecret, callbackUrl, active } = body || {}

  try {
    const node = await prisma.evaluateNode.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(baseUrl !== undefined ? { baseUrl } : {}),
        ...(sharedSecret !== undefined ? { sharedSecret } : {}),
        ...(callbackUrl !== undefined ? { callbackUrl } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      }
    })
    return { success: true, data: node }
  } catch (err) {
    console.error('Failed to update evaluate node:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update evaluate node' })
  }
})
