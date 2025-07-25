export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useCustomAuth()

  // 如果用户未登录，重定向到登录页面
  if (!isLoggedIn.value) {
    // 如果已经是登录页，则不进行任何操作
    if (to.path === '/login') {
      return
    }

    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }
})