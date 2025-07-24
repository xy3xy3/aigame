export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  // Clear the auth cookie
  deleteCookie(event, 'auth-token')
  
  return {
    success: true,
    message: 'Logged out successfully'
  }
})