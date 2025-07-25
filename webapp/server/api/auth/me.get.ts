import { getUserFromToken } from '../../utils/jwt'
import { excludePassword } from '../../utils/auth'
import { processUserAvatarUrl } from '../../utils/url'

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

  // 处理用户头像URL
  const processedUser = excludePassword(user)
  if (processedUser.avatarUrl) {
    processedUser.avatarUrl = processUserAvatarUrl(processedUser.avatarUrl)
  }

  return {
    success: true,
    user: processedUser
  }
})