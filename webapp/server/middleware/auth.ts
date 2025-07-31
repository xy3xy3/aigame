import { getUserFromToken } from '../utils/jwt'
import { checkUserBanned } from '../utils/auth'

export default defineEventHandler(async (event) => {
  // Only apply to protected API routes
  if (!event.path.startsWith('/api/')) {
    return
  }

  // Exclude specific auth routes that don't require authentication
  const excludedAuthRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/settings'
  ]

  if (excludedAuthRoutes.includes(event.path)) {
    return
  }

  const token = getCookie(event, 'auth-token')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const user = await getUserFromToken(token)

  if (!user) {
    deleteCookie(event, 'auth-token')
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }

  // Check if user is banned - force logout if banned
  try {
    checkUserBanned(user)
  } catch (error) {
    deleteCookie(event, 'auth-token')
    throw createError({
      statusCode: 401,
      statusMessage: 'Account has been banned'
    })
  }

  // Add user to context for other handlers
  event.context.user = user
})