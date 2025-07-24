export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn, fetchUser } = useAuth()
  
  // Try to fetch user if not already logged in
  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }
})