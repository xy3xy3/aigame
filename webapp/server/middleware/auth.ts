import { getUserFromToken } from '../utils/jwt'

export default defineEventHandler(async (event) => {
  // Only apply to protected API routes
  if (!event.path.startsWith('/api/') || event.path.startsWith('/api/auth/')) {
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
  
  // Add user to context for other handlers
  event.context.user = user
})