<template>
  <div class="max-w-4xl mx-auto py-6 px-4">
    <h1 class="text-2xl font-bold mb-6">认证状态测试</h1>
    
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">当前认证状态</h2>
      
      <div class="space-y-2">
        <p><strong>是否已登录:</strong> {{ isLoggedIn ? '是' : '否' }}</p>
        <p><strong>加载中:</strong> {{ isLoading ? '是' : '否' }}</p>
        <p><strong>用户信息:</strong></p>
        <pre v-if="user" class="bg-gray-100 p-3 rounded text-sm">{{ JSON.stringify(user, null, 2) }}</pre>
        <p v-else class="text-gray-500">无用户信息</p>
      </div>
      
      <div class="mt-4 space-x-4">
        <button 
          @click="handleFetchUser"
          :disabled="isLoading"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {{ isLoading ? '获取中...' : '获取用户信息' }}
        </button>
        
        <button 
          v-if="isLoggedIn"
          @click="handleLogout"
          :disabled="isLoading"
          class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {{ isLoading ? '退出中...' : '退出登录' }}
        </button>
      </div>
    </div>
    
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-4">快速登录测试</h2>
      
      <form @submit.prevent="handleTestLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">邮箱</label>
          <input 
            v-model="testForm.email"
            type="email" 
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="test@example.com"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700">密码</label>
          <input 
            v-model="testForm.password"
            type="password" 
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="123456"
          >
        </div>
        
        <button 
          type="submit"
          :disabled="isLoading"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {{ isLoading ? '登录中...' : '测试登录' }}
        </button>
      </form>
      
      <div v-if="error" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
// 使用认证状态管理
const { user, isLoggedIn, isLoading, login, logout, fetchUser } = useCustomAuth()

const error = ref('')
const testForm = reactive({
  email: 'test@example.com',
  password: '123456'
})

const handleFetchUser = async () => {
  error.value = ''
  try {
    await fetchUser()
  } catch (err) {
    error.value = err.statusMessage || err.message || '获取用户信息失败'
  }
}

const handleLogout = async () => {
  error.value = ''
  try {
    await logout()
  } catch (err) {
    error.value = err.statusMessage || err.message || '退出登录失败'
  }
}

const handleTestLogin = async () => {
  error.value = ''
  try {
    await login(testForm.email, testForm.password)
  } catch (err) {
    error.value = err.statusMessage || err.message || '登录失败'
  }
}

// 页面加载时获取用户信息
onMounted(async () => {
  await handleFetchUser()
})
</script>
