<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载题目信息失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.problem" class="space-y-8">
      <!-- 题目头部信息 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-3xl font-bold text-gray-900">{{ data.problem.title }}</h1>
          <span 
            :class="{
              'bg-green-100 text-green-800': data.problem.status === 'ongoing',
              'bg-blue-100 text-blue-800': data.problem.status === 'upcoming',
              'bg-gray-100 text-gray-800': data.problem.status === 'ended'
            }"
            class="px-3 py-1 rounded-full text-sm font-medium"
          >
            {{ getStatusText(data.problem.status) }}
          </span>
        </div>
        
        <p class="text-lg text-gray-600 mb-6">{{ data.problem.shortDescription }}</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">题目信息</h3>
            <div class="space-y-2 text-sm text-gray-600">
              <p><span class="font-medium">开始时间:</span> {{ formatDate(data.problem.startTime) }}</p>
              <p><span class="font-medium">结束时间:</span> {{ formatDate(data.problem.endTime) }}</p>
              <p><span class="font-medium">所属比赛:</span> 
                <NuxtLink :to="`/competitions/${data.problem.competitionId}`" class="text-indigo-600 hover:text-indigo-800">
                  {{ data.problem.competition?.title }}
                </NuxtLink>
              </p>
              <p><span class="font-medium">提交数量:</span> {{ data.problem._count?.submissions || 0 }}</p>
            </div>
          </div>
          
          <div v-if="data.problem.status === 'ongoing' && userTeams?.length > 0">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">提交解答</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">选择队伍</label>
                <select 
                  v-model="selectedTeamId" 
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">请选择队伍</option>
                  <option v-for="team in userTeams" :key="team.id" :value="team.id">
                    {{ team.name }}
                  </option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">上传文件</label>
                <input 
                  ref="fileInput"
                  type="file" 
                  @change="handleFileSelect"
                  accept=".zip,.py,.txt,.md,.json,.yaml,.yml"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                <p class="text-xs text-gray-500 mt-1">
                  支持格式: .zip, .py, .txt, .md, .json, .yaml, .yml (最大50MB)
                </p>
              </div>
              
              <button
                @click="submitFile"
                :disabled="!selectedTeamId || !selectedFile || isSubmitting"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? '提交中...' : '提交解答' }}
              </button>
              
              <div v-if="submitError" class="bg-red-50 border border-red-200 rounded-md p-3">
                <p class="text-red-800 text-sm">{{ submitError }}</p>
              </div>
              
              <div v-if="submitSuccess" class="bg-green-50 border border-green-200 rounded-md p-3">
                <p class="text-green-800 text-sm">提交成功！</p>
              </div>
            </div>
          </div>
          
          <div v-else-if="data.problem.status !== 'ongoing'">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">提交状态</h3>
            <p class="text-gray-600">
              {{ data.problem.status === 'upcoming' ? '题目尚未开始' : '题目已结束' }}
            </p>
          </div>
          
          <div v-else-if="!userTeams?.length">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">参加比赛</h3>
            <p class="text-gray-600 mb-3">您需要加入队伍才能提交解答</p>
            <NuxtLink 
              to="/teams" 
              class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              管理队伍
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 题目详细描述 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">题目描述</h2>
        <div class="prose max-w-none">
          <div class="text-gray-700 whitespace-pre-wrap">{{ data.problem.detailedDescription }}</div>
        </div>
      </div>

      <!-- 数据集和评测脚本 -->
      <div v-if="data.problem.datasetUrl || data.problem.judgingScriptUrl" class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">相关资源</h2>
        <div class="space-y-3">
          <div v-if="data.problem.datasetUrl">
            <a 
              :href="data.problem.datasetUrl" 
              target="_blank"
              class="inline-flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              下载数据集
            </a>
          </div>
          <div v-if="data.problem.judgingScriptUrl">
            <a 
              :href="data.problem.judgingScriptUrl" 
              target="_blank"
              class="inline-flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              下载评测脚本
            </a>
          </div>
        </div>
      </div>

      <!-- 我的提交记录 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">我的提交记录</h2>
        
        <div v-if="submissionsPending" class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <p class="mt-2 text-gray-600">加载提交记录中...</p>
        </div>
        
        <div v-else-if="submissionsError" class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-red-800">加载提交记录失败: {{ submissionsError.message }}</p>
        </div>
        
        <div v-else-if="submissionsData?.submissions?.length === 0" class="text-center py-8">
          <p class="text-gray-600">暂无提交记录</p>
        </div>
        
        <div v-else class="space-y-3">
          <div 
            v-for="submission in submissionsData?.submissions" 
            :key="submission.id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-3">
                <span class="font-medium text-gray-900">{{ submission.team.name }}</span>
                <span 
                  :class="{
                    'bg-yellow-100 text-yellow-800': submission.status === 'PENDING',
                    'bg-blue-100 text-blue-800': submission.status === 'JUDGING',
                    'bg-green-100 text-green-800': submission.status === 'COMPLETED',
                    'bg-red-100 text-red-800': submission.status === 'ERROR'
                  }"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ getSubmissionStatusText(submission.status) }}
                </span>
              </div>
              <span class="text-sm text-gray-500">{{ formatDate(submission.submittedAt) }}</span>
            </div>
            
            <div v-if="submission.score !== null" class="mb-2">
              <span class="text-sm text-gray-600">得分: </span>
              <span class="font-medium text-lg">{{ submission.score }}</span>
            </div>
            
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">提交者: {{ submission.user.username }}</span>
              <NuxtLink
                :to="`/submissions/${submission.id}`"
                class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                查看详情
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">题目不存在</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const { user } = useAuth()
const problemId = route.params.id

// 获取题目信息
const { data, pending, error } = await useFetch(`/api/problems/${problemId}`)

// 获取用户的队伍列表
const { data: teamsData } = await useFetch('/api/teams')
const userTeams = computed(() => teamsData.value?.teams || [])

// 获取提交记录
const { data: submissionsData, pending: submissionsPending, error: submissionsError, refresh: refreshSubmissions } = await useFetch('/api/submissions', {
  query: { problemId }
})

// 提交相关状态
const selectedTeamId = ref('')
const selectedFile = ref(null)
const fileInput = ref(null)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  selectedFile.value = file
  submitError.value = ''
  submitSuccess.value = false
}

const submitFile = async () => {
  if (!selectedTeamId.value || !selectedFile.value) return
  
  isSubmitting.value = true
  submitError.value = ''
  submitSuccess.value = false
  
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('problemId', problemId)
    formData.append('competitionId', data.value.problem.competitionId)
    formData.append('teamId', selectedTeamId.value)
    
    const response = await $fetch('/api/submissions/upload', {
      method: 'POST',
      body: formData
    })
    
    if (response.success) {
      submitSuccess.value = true
      selectedFile.value = null
      fileInput.value.value = ''
      await refreshSubmissions()
    }
    
  } catch (err) {
    submitError.value = err.data?.message || err.message || '提交失败'
  } finally {
    isSubmitting.value = false
  }
}

const getStatusText = (status) => {
  const statusMap = {
    'upcoming': '即将开始',
    'ongoing': '进行中',
    'ended': '已结束'
  }
  return statusMap[status] || status
}

const getSubmissionStatusText = (status) => {
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
