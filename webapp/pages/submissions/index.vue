<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">我的提交</h1>
      <p class="mt-2 text-gray-600">查看您的所有提交记录</p>
    </div>

    <!-- 筛选器 -->
    <div class="mb-6 flex flex-wrap gap-4">
      <select 
        v-model="selectedStatus" 
        @change="fetchSubmissions"
        class="border border-gray-300 rounded-md px-3 py-2"
      >
        <option value="">全部状态</option>
        <option value="PENDING">等待评测</option>
        <option value="JUDGING">评测中</option>
        <option value="COMPLETED">已完成</option>
        <option value="ERROR">评测失败</option>
      </select>

      <select 
        v-model="selectedTeamId" 
        @change="fetchSubmissions"
        class="border border-gray-300 rounded-md px-3 py-2"
      >
        <option value="">全部队伍</option>
        <option v-for="team in userTeams" :key="team.id" :value="team.id">
          {{ team.name }}
        </option>
      </select>
    </div>

    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载提交列表失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.submissions?.length === 0" class="text-center py-8">
      <p class="text-gray-600">暂无提交记录</p>
      <NuxtLink 
        to="/competitions" 
        class="mt-4 inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
      >
        参加比赛
      </NuxtLink>
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="submission in data?.submissions" 
        :key="submission.id"
        class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3">
            <h3 class="text-lg font-semibold text-gray-900">{{ submission.problem.title }}</h3>
            <span 
              :class="{
                'bg-yellow-100 text-yellow-800': submission.status === 'PENDING',
                'bg-blue-100 text-blue-800': submission.status === 'JUDGING',
                'bg-green-100 text-green-800': submission.status === 'COMPLETED',
                'bg-red-100 text-red-800': submission.status === 'ERROR'
              }"
              class="px-2 py-1 rounded-full text-xs font-medium"
            >
              {{ getStatusText(submission.status) }}
            </span>
          </div>
          <div class="text-right">
            <div v-if="submission.score !== null" class="text-lg font-bold text-indigo-600">
              {{ submission.score }} 分
            </div>
            <div class="text-sm text-gray-500">{{ formatDate(submission.submittedAt) }}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p class="text-sm text-gray-600 mb-1">比赛</p>
            <NuxtLink 
              :to="`/competitions/${submission.competition.id}`"
              class="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {{ submission.competition.title }}
            </NuxtLink>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">队伍</p>
            <NuxtLink 
              :to="`/teams/${submission.team.id}`"
              class="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {{ submission.team.name }}
            </NuxtLink>
          </div>
        </div>

        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-1">题目描述</p>
          <p class="text-gray-700 line-clamp-2">{{ submission.problem.shortDescription }}</p>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">
            <span>提交者: {{ submission.user.username }}</span>
            <span v-if="submission.judgedAt" class="ml-4">
              评测时间: {{ formatDate(submission.judgedAt) }}
            </span>
          </div>
          <div class="flex space-x-2">
            <NuxtLink
              :to="`/problems/${submission.problem.id}`"
              class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              查看题目
            </NuxtLink>
            <NuxtLink
              :to="`/submissions/${submission.id}`"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium"
            >
              查看详情
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="data?.pagination && data.pagination.totalPages > 1" class="mt-8 flex justify-center">
      <nav class="flex space-x-2">
        <button
          v-for="page in data.pagination.totalPages"
          :key="page"
          @click="goToPage(page)"
          :class="{
            'bg-indigo-600 text-white': page === currentPage,
            'bg-white text-gray-700 hover:bg-gray-50': page !== currentPage
          }"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium"
        >
          {{ page }}
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const selectedStatus = ref('')
const selectedTeamId = ref('')
const currentPage = ref(1)

// 获取用户的队伍列表
const { data: teamsData } = await useFetch('/api/teams')
const userTeams = computed(() => teamsData.value?.teams || [])

const { data, pending, error, refresh } = await useFetch('/api/submissions', {
  query: {
    status: selectedStatus,
    teamId: selectedTeamId,
    page: currentPage
  }
})

const fetchSubmissions = () => {
  currentPage.value = 1
  refresh()
}

const goToPage = (page) => {
  currentPage.value = page
  refresh()
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
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
