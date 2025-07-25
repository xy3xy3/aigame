import type { SafeUser } from '~/server/utils/auth'

interface AuthState {
  user: SafeUser | null
  isLoggedIn: boolean
  isLoading: boolean
}

export const useCustomAuth = () => {
  const user = useState<SafeUser | null>('auth.user', () => null)
  const isLoading = useState<boolean>('auth.loading', () => false)

  const isLoggedIn = computed(() => !!user.value)

  const login = async (identifier: string, password: string) => {
    isLoading.value = true
    try {
      const data = await $fetch<{ success: boolean; user: SafeUser; token: string }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password }
      })

      if (data.success) {
        user.value = data.user
        await navigateTo('/')
      }

      return { success: true }
    } catch (error: any) {
      throw createError({
        statusCode: error?.status || 400,
        statusMessage: error?.statusMessage || 'Login failed'
      })
    } finally {
      isLoading.value = false
    }
  }

  const register = async (username: string, email: string, password: string, phoneNumber?: string, studentId?: string, realName?: string) => {
    isLoading.value = true
    try {
      const data = await $fetch<{ success: boolean; user: SafeUser; token: string }>('/api/auth/register', {
        method: 'POST',
        body: { username, email, password, phoneNumber, studentId, realName }
      })

      if (data.success) {
        user.value = data.user
        // Don't redirect here, let the page handle it
      }

      return { success: true }
    } catch (error: any) {
      throw createError({
        statusCode: error?.status || 400,
        statusMessage: error?.statusMessage || 'Registration failed'
      })
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST'
      })

      user.value = null
      await navigateTo('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      isLoading.value = false
    }
  }

  const fetchUser = async () => {
    isLoading.value = true
    try {
      const data = await $fetch<{ success: boolean; user: SafeUser }>('/api/auth/me')

      if (data.success) {
        user.value = data.user
      }
    } catch (error) {
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  return {
    user: readonly(user),
    isLoggedIn,
    isLoading: readonly(isLoading),
    login,
    register,
    logout,
    fetchUser
  }
}

// 创建别名以便在中间件中使用
export const useAuth = useCustomAuth