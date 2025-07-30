<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载提交信息失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.submission" class="space-y-8">
      <!-- 提交头部信息 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-3xl font-bold text-gray-900">提交详情</h1>
          <span
            :class="{
              'bg-yellow-100 text-yellow-800': data.submission.status === 'PENDING',
              'bg-blue-100 text-blue-800': data.submission.status === 'JUDGING',
              'bg-green-100 text-green-800': data.submission.status === 'COMPLETED',
              'bg-red-100 text-red-800': data.submission.status === 'ERROR'
            }"
            class="px-3 py-1 rounded-full text-sm font-medium"
          >
            {{ getStatusText(data.submission.status) }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">基本信息</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">题目:</span>
                <NuxtLink
                  :to="`/problems/${data.submission.problem.id}`"
                  class="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {{ data.submission.problem.title }}
                </NuxtLink>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">比赛:</span>
                <NuxtLink
                  :to="`/competitions/${data.submission.competition.id}`"
                  class="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {{ data.submission.competition.title }}
                </NuxtLink>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">队伍:</span>
                <NuxtLink
                  :to="`/teams/${data.submission.team.id}`"
                  class="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {{ data.submission.team.name }}
                </NuxtLink>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">提交者:</span>
                <span class="font-medium">{{ data.submission.user.username }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">提交时间:</span>
                <span class="font-medium">{{ formatDate(data.submission.createdAt) }}</span>
              </div>
              <div v-if="data.submission.judgedAt" class="flex justify-between">
                <span class="text-gray-600">评测时间:</span>
                <span class="font-medium">{{ formatDate(data.submission.judgedAt) }}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">评测结果</h3>
            <div class="space-y-3">
              <div v-if="data.submission.score !== null" class="text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-3xl font-bold text-indigo-600">{{ data.submission.score }}</div>
                <div class="text-sm text-gray-600">得分</div>
              </div>

              <div v-else-if="data.submission.status === 'PENDING'" class="text-center p-4 bg-yellow-50 rounded-lg">
                <div class="text-yellow-600">
                  <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div class="text-sm">等待评测中...</div>
                </div>
              </div>

              <div v-else-if="data.submission.status === 'JUDGING'" class="text-center p-4 bg-blue-50 rounded-lg">
                <div class="text-blue-600">
                  <svg class="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <div class="text-sm">正在评测中...</div>
                </div>
              </div>

              <div v-else-if="data.submission.status === 'ERROR'" class="text-center p-4 bg-red-50 rounded-lg">
                <div class="text-red-600">
                  <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div class="text-sm">评测失败</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 题目描述 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">题目描述</h2>
        <div class="prose max-w-none">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ data.submission.problem.title }}</h3>
          <p class="text-gray-600 mb-4">{{ data.submission.problem.shortDescription }}</p>
          <div class="text-gray-700 whitespace-pre-wrap">{{ data.submission.problem.detailedDescription }}</div>
        </div>
      </div>

      <!-- 执行日志 -->
      <div v-if="data.submission.executionLogs" class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">执行日志</h2>
        <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
          <pre>{{ data.submission.executionLogs }}</pre>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">操作</h2>
        <div class="flex space-x-4">
          <NuxtLink
            :to="`/problems/${data.submission.problem.id}`"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            返回题目
          </NuxtLink>
          <NuxtLink
            :to="`/competitions/${data.submission.competition.id}`"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            返回比赛
          </NuxtLink>
          <button
            v-if="data.submission.status === 'PENDING' || data.submission.status === 'JUDGING'"
            @click="refreshSubmission"
            :disabled="isRefreshing"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {{ isRefreshing ? '刷新中...' : '刷新状态' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">提交不存在</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const submissionId = route.params.id

const { data, pending, error, refresh } = await useFetch(`/api/submissions/${submissionId}`)

const isRefreshing = ref(false)

const refreshSubmission = async () => {
  isRefreshing.value = true
  try {
    await refresh()
  } finally {
    isRefreshing.value = false
  }
}

const getStatusText = (status) => {
  const statusMap = {
    'PENDING': '等待评测',
    'JUDGING': '评测中',
    'COMPLETED': '已完成',
    'ERROR': '评测失败'
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 自动刷新正在评测的提交
onMounted(() => {
  const interval = setInterval(async () => {
    if (data.value?.submission?.status === 'PENDING' || data.value?.submission?.status === 'JUDGING') {
      await refresh()
    } else {
      clearInterval(interval)
    }
  }, 5000) // 每5秒刷新一次

  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>
