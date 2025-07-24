<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载排行榜失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data" class="space-y-6">
      <!-- 头部信息 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">排行榜</h1>
            <p class="text-gray-600">{{ data.competition.title }}</p>
          </div>
          <div class="text-right">
            <button
              @click="refreshLeaderboard"
              :disabled="isRefreshing"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {{ isRefreshing ? '刷新中...' : '刷新' }}
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-gray-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-indigo-600">{{ data.stats.totalTeams }}</div>
            <div class="text-sm text-gray-600">参赛队伍</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{{ data.stats.totalSubmissions }}</div>
            <div class="text-sm text-gray-600">总提交数</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 text-center">
            <div class="text-sm text-gray-600">最后更新</div>
            <div class="text-sm font-medium">{{ formatDate(data.stats.lastUpdated) }}</div>
          </div>
        </div>
      </div>

      <!-- 排行榜 -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">实时排名</h2>
        </div>
        
        <div v-if="data.leaderboard.length === 0" class="text-center py-8">
          <p class="text-gray-600">暂无排名数据</p>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  排名
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  队伍
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  队长
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  总分
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr 
                v-for="entry in data.leaderboard" 
                :key="entry.team.id"
                :class="{
                  'bg-yellow-50': entry.rank === 1,
                  'bg-gray-50': entry.rank === 2,
                  'bg-orange-50': entry.rank === 3
                }"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div 
                      :class="{
                        'bg-yellow-500 text-white': entry.rank === 1,
                        'bg-gray-400 text-white': entry.rank === 2,
                        'bg-orange-500 text-white': entry.rank === 3,
                        'bg-gray-200 text-gray-700': entry.rank > 3
                      }"
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    >
                      {{ entry.rank }}
                    </div>
                    <div v-if="entry.rank <= 3" class="ml-2">
                      <span v-if="entry.rank === 1">🥇</span>
                      <span v-else-if="entry.rank === 2">🥈</span>
                      <span v-else-if="entry.rank === 3">🥉</span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div v-if="entry.team.avatarUrl" class="flex-shrink-0 h-10 w-10">
                      <img 
                        :src="entry.team.avatarUrl" 
                        :alt="entry.team.name"
                        class="h-10 w-10 rounded-full object-cover"
                      >
                    </div>
                    <div v-else class="flex-shrink-0 h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span class="text-gray-600 font-medium">{{ entry.team.name.charAt(0) }}</span>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ entry.team.name }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ entry.team.captain?.username || 'Unknown' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-lg font-bold text-indigo-600">{{ entry.totalScore.toFixed(2) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <NuxtLink
                    :to="`/teams/${entry.team.id}`"
                    class="text-indigo-600 hover:text-indigo-900"
                  >
                    查看队伍
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 我的排名 -->
      <div v-if="userTeamRanks.length > 0" class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">我的队伍排名</h2>
        <div class="space-y-3">
          <div 
            v-for="teamRank in userTeamRanks" 
            :key="teamRank.teamId"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <span class="font-medium">{{ teamRank.teamName }}</span>
              <span v-if="teamRank.rank" class="ml-2 text-sm text-gray-600">
                第 {{ teamRank.rank }} 名
              </span>
              <span v-else class="ml-2 text-sm text-gray-600">未排名</span>
            </div>
            <div class="text-lg font-bold text-indigo-600">
              {{ teamRank.score.toFixed(2) }} 分
            </div>
          </div>
        </div>
      </div>

      <!-- 返回比赛 -->
      <div class="text-center">
        <NuxtLink
          :to="`/competitions/${route.params.id}`"
          class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
        >
          返回比赛
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const { user } = useAuth()
const competitionId = route.params.id

const { data, pending, error, refresh } = await useFetch(`/api/competitions/${competitionId}/leaderboard`)

// 获取用户的队伍列表
const { data: teamsData } = await useFetch('/api/teams')
const userTeams = computed(() => teamsData.value?.teams || [])

// 获取用户队伍的排名
const userTeamRanks = ref([])

const isRefreshing = ref(false)

const refreshLeaderboard = async () => {
  isRefreshing.value = true
  try {
    await refresh()
    await fetchUserTeamRanks()
  } finally {
    isRefreshing.value = false
  }
}

const fetchUserTeamRanks = async () => {
  if (!userTeams.value.length) return
  
  const ranks = []
  for (const team of userTeams.value) {
    try {
      const rankData = await $fetch(`/api/teams/${team.id}/rank`, {
        query: { competitionId }
      })
      
      ranks.push({
        teamId: team.id,
        teamName: team.name,
        rank: rankData.rank,
        score: rankData.score
      })
    } catch (error) {
      console.error(`Failed to fetch rank for team ${team.id}:`, error)
    }
  }
  
  userTeamRanks.value = ranks
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 初始化时获取用户队伍排名
onMounted(() => {
  fetchUserTeamRanks()
})

// 自动刷新排行榜（每30秒）
onMounted(() => {
  const interval = setInterval(async () => {
    await refresh()
  }, 30000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>
