export default defineNuxtRouteMiddleware(async (to) => {
    const { isLoggedIn, user, fetchUser } = useCustomAuth()

    // 优先尝试校验并获取用户信息，只有失败时才跳转登录
    if (!isLoggedIn.value) {
        try {
            await fetchUser()
        } catch (_) {
            // 忽略错误，由后续逻辑处理未登录情况
        }

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
    }

    // 检查用户角色是否为admin
    if (user.value?.role !== 'admin') {
        // 如果不是管理员，重定向到首页并显示错误信息
        return navigateTo({
            path: '/',
            query: {
                error: 'access_denied',
                message: '您没有权限访问此页面'
            }
        })
    }
})
