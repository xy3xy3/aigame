<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">比赛列表</h1>
      <p class="mt-2 text-gray-600">参加AI竞赛，展示您的技能</p>
    </div>

    <!-- 筛选器 -->
    <div class="mb-6 flex space-x-4">
      <select 
        v-model="selectedStatus" 
        @change="fetchCompetitions"
        class="border border-gray-300 rounded-md px-3 py-2"
      >
        <option value="">全部状态</option>
        <option value="upcoming">即将开始</option>
        <option value="ongoing">进行中</option>
        <option value="ended">已结束</option>
      </select>
    </div>

    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载比赛列表失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.competitions?.length === 0" class="text-center py-8">
      <p class="text-gray-600">暂无比赛</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="competition in data?.competitions" 
        :key="competition.id"
        class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
      >
        <div v-if="competition.bannerUrl" class="h-48 bg-gray-200">
          <img 
            :src="competition.bannerUrl" 
            :alt="competition.title"
            class="w-full h-full object-cover"
          >
        </div>
        <div v-else class="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
          <h3 class="text-white text-xl font-bold text-center px-4">{{ competition.title }}</h3>
        </div>
        
        <div class="p-6">
          <div class="flex items-center justify-between mb-2">
            <h3 v-if="!competition.bannerUrl" class="text-lg font-semibold text-gray-900">{{ competition.title }}</h3>
            <span 
              :class="{
                'bg-green-100 text-green-800': competition.status === 'ongoing',
                'bg-blue-100 text-blue-800': competition.status === 'upcoming',
                'bg-gray-100 text-gray-800': competition.status === 'ended'
              }"
              class="px-2 py-1 rounded-full text-xs font-medium"
            >
              {{ getStatusText(competition.status) }}
            </span>
          </div>
          
          <p class="text-gray-600 text-sm mb-4 line-clamp-3">{{ competition.description }}</p>
          
          <div class="text-sm text-gray-500 mb-4">
            <p>开始时间: {{ formatDate(competition.startTime) }}</p>
            <p>结束时间: {{ formatDate(competition.endTime) }}</p>
            <p>题目数量: {{ competition.problems?.length || 0 }}</p>
            <p>提交数量: {{ competition._count?.submissions || 0 }}</p>
          </div>
          
          <div class="flex space-x-2">
            <NuxtLink
              :to="`/competitions/${competition.id}`"
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              查看详情
            </NuxtLink>
            <button
              v-if="competition.status === 'ongoing'"
              @click="joinCompetition(competition.id)"
              class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              参加比赛
            </button>
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
const selectedStatus = ref('')
const currentPage = ref(1)

const { data, pending, error, refresh } = await useFetch('/api/competitions', {
  query: {
    status: selectedStatus,
    page: currentPage
  }
})

const fetchCompetitions = () => {
  currentPage.value = 1
  refresh()
}

const goToPage = (page) => {
  currentPage.value = page
  refresh()
}

const getStatusText = (status) => {
  const statusMap = {
    'upcoming': '即将开始',
    'ongoing': '进行中',
    'ended': '已结束'
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const joinCompetition = async (competitionId) => {
  // TODO: 实现参加比赛逻辑
  console.log('Join competition:', competitionId)
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
