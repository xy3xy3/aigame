<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <NuxtLink to="/" class="text-xl font-bold text-gray-900">
                AI竞赛平台
              </NuxtLink>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NuxtLink
                to="/competitions"
                class="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                比赛
              </NuxtLink>
              <NuxtLink
                v-if="isLoggedIn"
                to="/teams"
                class="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                我的队伍
              </NuxtLink>
              <NuxtLink
                v-if="isLoggedIn"
                to="/submissions"
                class="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                我的提交
              </NuxtLink>
              <NuxtLink
                v-if="isLoggedIn"
                to="/admin/dashboard"
                class="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                管理后台
              </NuxtLink>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <template v-if="isLoggedIn">
              <span class="text-sm text-gray-700">
                欢迎, {{ user?.username }}
              </span>
              <button
                @click="handleLogout"
                class="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                退出
              </button>
            </template>
            <template v-else>
              <NuxtLink
                to="/login"
                class="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                登录
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                注册
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
// 使用认证状态管理
const { user, isLoggedIn, logout, fetchUser } = useCustomAuth()

// 在组件挂载时获取用户信息
onMounted(async () => {
  if (!user.value) {
    await fetchUser()
  }
})

const handleLogout = async () => {
  await logout()
}
</script>