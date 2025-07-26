export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn, user } = useCustomAuth()

  // 检查路由元数据中是否指定了所需的角色
  const requiredRole = to.meta.requiredRole

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

  // 如果指定了所需角色，检查用户是否具有该角色
  if (requiredRole && user.value?.role !== requiredRole) {
    // 如果用户角色不匹配，重定向到首页并显示错误信息
    return navigateTo({
      path: '/',
      query: {
        error: 'access_denied',
        message: '您没有权限访问此页面'
      }
    })
  }
})