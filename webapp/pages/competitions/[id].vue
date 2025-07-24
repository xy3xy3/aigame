<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载比赛信息失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.competition" class="space-y-8">
      <!-- 比赛头部信息 -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div v-if="data.competition.bannerUrl" class="h-64 bg-gray-200">
          <img 
            :src="data.competition.bannerUrl" 
            :alt="data.competition.title"
            class="w-full h-full object-cover"
          >
        </div>
        <div v-else class="h-64 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
          <h1 class="text-white text-4xl font-bold text-center px-4">{{ data.competition.title }}</h1>
        </div>
        
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h1 v-if="data.competition.bannerUrl" class="text-3xl font-bold text-gray-900">{{ data.competition.title }}</h1>
            <span 
              :class="{
                'bg-green-100 text-green-800': data.competition.status === 'ongoing',
                'bg-blue-100 text-blue-800': data.competition.status === 'upcoming',
                'bg-gray-100 text-gray-800': data.competition.status === 'ended'
              }"
              class="px-3 py-1 rounded-full text-sm font-medium"
            >
              {{ getStatusText(data.competition.status) }}
            </span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">比赛信息</h3>
              <div class="space-y-2 text-sm text-gray-600">
                <p><span class="font-medium">开始时间:</span> {{ formatDate(data.competition.startTime) }}</p>
                <p><span class="font-medium">结束时间:</span> {{ formatDate(data.competition.endTime) }}</p>
                <p><span class="font-medium">创建者:</span> {{ data.competition.creator.username }}</p>
                <p><span class="font-medium">题目数量:</span> {{ data.competition.problems?.length || 0 }}</p>
                <p><span class="font-medium">提交数量:</span> {{ data.competition._count?.submissions || 0 }}</p>
              </div>
            </div>
            
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">操作</h3>
              <div class="space-y-2">
                <button
                  v-if="data.competition.status === 'ongoing'"
                  @click="joinCompetition"
                  class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  参加比赛
                </button>
                <NuxtLink
                  :to="`/competitions/${data.competition.id}/leaderboard`"
                  class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
                >
                  查看排行榜
                </NuxtLink>
              </div>
            </div>
          </div>
          
          <div class="prose max-w-none">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">比赛描述</h3>
            <p class="text-gray-700 whitespace-pre-wrap">{{ data.competition.description }}</p>
          </div>
        </div>
      </div>

      <!-- 比赛规则 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">比赛规则</h2>
        <div class="prose max-w-none">
          <div class="text-gray-700 whitespace-pre-wrap">{{ data.competition.rules }}</div>
        </div>
      </div>

      <!-- 题目列表 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">题目列表</h2>
        
        <div v-if="problemsPending" class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <p class="mt-2 text-gray-600">加载题目中...</p>
        </div>
        
        <div v-else-if="problemsError" class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-red-800">加载题目失败: {{ problemsError.message }}</p>
        </div>
        
        <div v-else-if="problemsData?.problems?.length === 0" class="text-center py-8">
          <p class="text-gray-600">暂无题目</p>
        </div>
        
        <div v-else class="space-y-4">
          <div 
            v-for="problem in problemsData?.problems" 
            :key="problem.id"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-gray-900">{{ problem.title }}</h3>
              <span 
                :class="{
                  'bg-green-100 text-green-800': problem.status === 'ongoing',
                  'bg-blue-100 text-blue-800': problem.status === 'upcoming',
                  'bg-gray-100 text-gray-800': problem.status === 'ended'
                }"
                class="px-2 py-1 rounded-full text-xs font-medium"
              >
                {{ getStatusText(problem.status) }}
              </span>
            </div>
            
            <p class="text-gray-600 mb-3">{{ problem.shortDescription }}</p>
            
            <div class="flex items-center justify-between text-sm text-gray-500">
              <div>
                <span>开始: {{ formatDate(problem.startTime) }}</span>
                <span class="mx-2">|</span>
                <span>结束: {{ formatDate(problem.endTime) }}</span>
                <span class="mx-2">|</span>
                <span>提交数: {{ problem._count?.submissions || 0 }}</span>
              </div>
              
              <NuxtLink
                :to="`/problems/${problem.id}`"
                class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-medium"
              >
                查看详情
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">比赛不存在</p>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const competitionId = route.params.id

const { data, pending, error } = await useFetch(`/api/competitions/${competitionId}`)

const { data: problemsData, pending: problemsPending, error: problemsError } = await useFetch(`/api/competitions/${competitionId}/problems`)

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

const joinCompetition = async () => {
  // TODO: 实现参加比赛逻辑
  console.log('Join competition:', competitionId)
}
</script>
