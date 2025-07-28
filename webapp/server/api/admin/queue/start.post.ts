import { requireAdminRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
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

  // Check admin role
  requireAdminRole(user)

  return {
    success: true,
    message: 'Evaluation worker is managed by the application startup process'
  }
})
