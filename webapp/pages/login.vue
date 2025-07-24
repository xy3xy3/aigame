<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          登录到您的账户
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="identifier" class="sr-only">邮箱地址或用户名</label>
            <input
              id="identifier"
              v-model="form.identifier"
              name="identifier"
              type="text"
              autocomplete="username"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="邮箱地址或用户名"
            >
          </div>
          <div>
            <label for="password" class="sr-only">密码</label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="密码"
            >
          </div>
        </div>

        <div v-if="error" class="text-red-600 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
        </div>

        <div class="text-center">
          <NuxtLink
            to="/register"
            class="text-indigo-600 hover:text-indigo-500"
          >
            还没有账户？注册
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
// 使用认证状态管理
const { login, isLoading } = useCustomAuth()

const form = reactive({
  identifier: '',
  password: ''
})

const error = ref('')

const handleLogin = async () => {
  if (isLoading.value) return

  error.value = ''

  try {
    await login(form.identifier, form.password)
    // 登录成功会自动跳转到首页
  } catch (err) {
    error.value = err.statusMessage || err.message || '登录失败'
  }
}
</script>