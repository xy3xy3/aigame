import prisma from '~/server/utils/prisma'
import { requireAdminRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  requireAdminRole(user)

  const body = await readBody(event)
  const { name, baseUrl, sharedSecret, callbackUrl, active } = body || {}

  if (!name || !baseUrl || !sharedSecret) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: name, baseUrl, sharedSecret' })
  }

  try {
    const node = await prisma.evaluateNode.create({
      data: {
        name,
        baseUrl,
        sharedSecret,
        callbackUrl,
        active: active !== undefined ? Boolean(active) : true,
      }
    })
    return { success: true, data: node }
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Node name already exists' })
    }
    console.error('Failed to create evaluate node:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create evaluate node' })
  }
})
