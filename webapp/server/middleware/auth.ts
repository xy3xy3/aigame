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
    '/api/announcements',

    '/api/submissions/callback' // Sandbox callback endpoint
  ]

  // Check if the current path matches any public route pattern
  const isPublicRoute = publicRoutes.some(route => {
    if (route === event.path) return true
    // Allow specific public sub-paths only - be more restrictive
    if (route === '/api/competitions') {
      // Only allow GET requests to view competitions and leaderboards
      if (event.method === 'GET') {
        if (event.path === '/api/competitions' || event.path === '/api/competitions/simple') return true
        if (event.path.match(/^\/api\/competitions\/[^\/]+$/)) return true // GET /api/competitions/[id]
        if (event.path.match(/^\/api\/competitions\/[^\/]+\/leaderboard$/)) return true
        if (event.path.match(/^\/api\/competitions\/[^\/]+\/problems$/)) return true
        if (event.path.match(/^\/api\/competitions\/[^\/]+\/solutions$/)) return true
        if (event.path.match(/^\/api\/competitions\/[^\/]+\/teams$/)) return true
      }
      return false
    }
    if (route === '/api/problems' && (event.path === '/api/problems' || event.path.match(/^\/api\/problems\/[^\/]+$/))) return true
    if (route === '/api/announcements' && (event.path === '/api/announcements' || event.path.match(/^\/api\/announcements\/[^\/]+$/))) return true
    return false
  })

  // 对于公共路由和排除的认证路由，尝试可选地注入用户信息（不强制要求认证）
  if (excludedAuthRoutes.includes(event.path) || isPublicRoute) {
    const token = getCookie(event, 'auth-token')
    if (token) {
      try {
        const user = await getUserFromToken(token)
        if (user) {
          // Check if user is banned - but don't throw error for public routes
          try {
            checkUserBanned(user)
            // Add user to context for optional use
            event.context.user = user
          } catch (error) {
            // User is banned, but don't block access to public routes
            // Just don't inject user info
          }
        }
      } catch (error) {
        // Invalid token, but don't block access to public routes
        // Just don't inject user info
      }
    }
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