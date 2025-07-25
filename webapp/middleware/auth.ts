export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useCustomAuth()

  // 添加调试日志
  console.log('[AUTH MIDDLEWARE] 访问路径:', to.path)
  console.log('[AUTH MIDDLEWARE] 完整路径:', to.fullPath)
  console.log('[AUTH MIDDLEWARE] 是否已登录:', isLoggedIn.value)

  // 如果用户未登录，重定向到登录页面
  if (!isLoggedIn.value) {
    // 如果已经是登录页，则不进行任何操作
    if (to.path === '/login') {
      console.log('[AUTH MIDDLEWARE] 已在登录页，不重定向')
      return
    }

    console.log('[AUTH MIDDLEWARE] 用户未登录，重定向到登录页')
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }

  console.log('[AUTH MIDDLEWARE] 用户已登录，允许访问')
})