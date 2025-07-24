<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <h1 class="text-3xl font-bold text-center text-gray-900 mb-4">
        AI竞赛平台
      </h1>
      <p class="text-gray-600 text-center mb-6">
        测试页面 - 如果您能看到这个页面，说明基本配置正确
      </p>
      <div class="space-y-4">
        <NuxtLink 
          to="/" 
          class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 px-4 rounded-md"
        >
          返回首页
        </NuxtLink>
        <NuxtLink 
          to="/register" 
          class="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded-md"
        >
          用户注册
        </NuxtLink>
        <NuxtLink 
          to="/login" 
          class="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md"
        >
          用户登录
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
// 简单的测试页面，不依赖复杂的状态管理
</script>
