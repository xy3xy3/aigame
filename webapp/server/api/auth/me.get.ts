import { getUserFromToken } from '../../utils/jwt'
import { excludePassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const token = getCookie(event, 'auth-token')
  
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated'
    })
  }
  
  const user = await getUserFromToken(token)
  
  if (!user) {
    // Clear invalid token
    deleteCookie(event, 'auth-token')
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }
  
  return {
    success: true,
    user: excludePassword(user)
  }
})