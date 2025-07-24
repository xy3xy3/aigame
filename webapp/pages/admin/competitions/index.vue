<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">比赛管理</h1>
        <p class="mt-2 text-gray-600">管理所有AI竞赛</p>
      </div>
      <NuxtLink
        to="/admin/competitions/create"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
      >
        创建新比赛
      </NuxtLink>
    </div>

    <!-- 筛选器 -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-4">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">状态筛选</label>
          <select
            v-model="selectedStatus"
            @change="fetchCompetitions"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="upcoming">即将开始</option>
            <option value="ongoing">进行中</option>
            <option value="ended">已结束</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="refresh"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            刷新
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 比赛列表 -->
    <div v-else-if="data?.competitions" class="space-y-6">
      <div
        v-for="competition in data.competitions"
        :key="competition.id"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center space-x-3 mb-2">
              <h3 class="text-xl font-semibold text-gray-900">{{ competition.title }}</h3>
              <span
                :class="{
                  'bg-yellow-100 text-yellow-800': competition.status === 'upcoming',
                  'bg-green-100 text-green-800': competition.status === 'ongoing',
                  'bg-gray-100 text-gray-800': competition.status === 'ended'
                }"
                class="px-2 py-1 rounded-full text-xs font-medium"
              >
                {{ getStatusText(competition.status) }}
              </span>
            </div>

            <p class="text-gray-600 mb-4 line-clamp-2">{{ competition.description }}</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
              <div>
                <span class="font-medium">开始时间:</span>
                {{ formatDate(competition.startTime) }}
              </div>
              <div>
                <span class="font-medium">结束时间:</span>
                {{ formatDate(competition.endTime) }}
              </div>
              <div>
                <span class="font-medium">创建者:</span>
                {{ competition.creator.username }}
              </div>
            </div>

            <div class="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span>题目数: {{ competition.problems?.length || 0 }}</span>
              <span>提交数: {{ competition._count?.submissions || 0 }}</span>
            </div>
          </div>

          <div class="flex flex-col space-y-2 ml-6">
            <NuxtLink
              :to="`/competitions/${competition.id}`"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              查看详情
            </NuxtLink>
            <NuxtLink
              :to="`/admin/competitions/${competition.id}/edit`"
              class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              编辑
            </NuxtLink>
            <NuxtLink
              :to="`/admin/competitions/${competition.id}`"
              class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              管理题目
            </NuxtLink>
            <NuxtLink
              :to="`/competitions/${competition.id}/leaderboard`"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              排行榜
            </NuxtLink>
            <button
              @click="deleteCompetition(competition.id)"
              class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 text-6xl mb-4">🏆</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无比赛</h3>
      <p class="text-gray-600 mb-6">开始创建你的第一个AI竞赛吧！</p>
      <NuxtLink
        to="/admin/competitions/create"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
      >
        创建新比赛
      </NuxtLink>
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
const currentPage = ref(1)

const { data, pending, error, refresh } = await useFetch('/api/competitions', {
  query: {
    status: selectedStatus,
    page: currentPage,
    limit: 20 // 管理页面显示更多
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

const deleteCompetition = async (competitionId) => {
  if (!confirm('确定要删除这个比赛吗？此操作不可撤销。')) {
    return
  }

  try {
    await $fetch(`/api/competitions/${competitionId}`, {
      method: 'DELETE'
    })

    // 刷新列表
    await refresh()

    // 显示成功消息
    alert('比赛删除成功')
  } catch (error) {
    console.error('删除比赛失败:', error)
    alert('删除比赛失败: ' + (error.data?.message || error.message))
  }
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
