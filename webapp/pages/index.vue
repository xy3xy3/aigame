<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        AI竞赛平台
      </h1>
      <p class="text-xl text-gray-600 mb-8">
        AI竞赛平台，支持多队伍参赛、自动评测和实时排行榜
      </p>

      <div v-if="!isLoggedIn" class="space-x-4">
        <NuxtLink
          to="/register"
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-medium"
        >
          开始使用
        </NuxtLink>
        <NuxtLink
          to="/competitions"
          class="bg-white hover:bg-gray-50 text-blue-600 border border-blue-600 px-6 py-3 rounded-md text-lg font-medium"
        >
          查看比赛
        </NuxtLink>
      </div>

      <div v-else class="space-x-4">
        <NuxtLink
          to="/competitions"
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-medium"
        >
          参加比赛
        </NuxtLink>
        <NuxtLink
          to="/teams"
          class="bg-white hover:bg-gray-50 text-blue-600 border border-blue-600 px-6 py-3 rounded-md text-lg font-medium"
        >
          队伍管理
        </NuxtLink>
      </div>
    </div>

    <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="text-center">
        <div class="bg-blue-100 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">组队参赛</h3>
          <p class="text-gray-600">创建或加入队伍，与队友协作参加AI比赛</p>
        </div>
      </div>
      <div class="text-center">
        <div class="bg-green-100 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">自动评测</h3>
          <p class="text-gray-600">提交代码后自动评测，实时获得分数和反馈</p>
        </div>
      </div>
      <div class="text-center">
        <div class="bg-yellow-100 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">实时排行榜</h3>
          <p class="text-gray-600">查看实时排名，追踪比赛进度和表现</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 使用认证状态管理
const { isLoggedIn, fetchUser } = useCustomAuth()

// 在组件挂载时获取用户信息
onMounted(async () => {
  await fetchUser()
})
</script>