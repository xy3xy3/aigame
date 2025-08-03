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
    '/api/auth/verify-email',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/resend-verification',
    '/api/settings'
  ]

  // Exclude public API routes that don't require authentication
  const publicRoutes = [
    '/api/competitions',
    '/api/competitions/simple',
    '/api/problems',
    '/api/announcements'
  ]

  // Check if the current path matches any public route pattern
  const isPublicRoute = publicRoutes.some(route => {
    if (route === event.path) return true
    // Allow sub-paths for specific routes like /api/competitions/[id]
    if (route === '/api/competitions' && event.path.startsWith('/api/competitions/')) return true
    if (route === '/api/problems' && event.path.startsWith('/api/problems/')) return true
    if (route === '/api/announcements' && event.path.startsWith('/api/announcements/')) return true
    return false
  })

  if (excludedAuthRoutes.includes(event.path) || isPublicRoute) {
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