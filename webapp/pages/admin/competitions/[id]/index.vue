<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 加载状态 -->
    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 竞赛详情和题目列表 -->
    <div v-else-if="data?.competition">
      <!-- 竞赛信息头部 -->
      <div class="mb-6">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ data.competition.title }}</h1>
            <p class="mt-2 text-gray-600">{{ data.competition.description }}</p>
            <div class="mt-4 flex items-center space-x-6 text-sm text-gray-500">
              <span>开始时间: {{ formatDate(data.competition.startTime) }}</span>
              <span>结束时间: {{ formatDate(data.competition.endTime) }}</span>
              <span>创建者: {{ data.competition.creator.username }}</span>
            </div>
          </div>
          <div class="flex space-x-3">
            <NuxtLink
              :to="`/admin/competitions/${competitionId}/edit`"
              class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md font-medium"
            >
              编辑竞赛
            </NuxtLink>
            <NuxtLink
              to="/admin/competitions"
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
            >
              返回列表
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 题目管理区域 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">题目管理</h2>
            <p class="mt-1 text-gray-600">管理该竞赛的所有题目</p>
          </div>
          <button
            @click="showCreateForm = true"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
          >
            添加题目
          </button>
        </div>

        <!-- 题目列表 -->
        <div v-if="problems.length > 0" class="space-y-4">
          <div
            v-for="problem in problems"
            :key="problem.id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <h3 class="text-lg font-semibold text-gray-900">{{ problem.title }}</h3>
                  <span
                    :class="{
                      'bg-yellow-100 text-yellow-800': problem.status === 'upcoming',
                      'bg-green-100 text-green-800': problem.status === 'ongoing',
                      'bg-gray-100 text-gray-800': problem.status === 'ended'
                    }"
                    class="px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {{ getStatusText(problem.status) }}
                  </span>
                </div>

                <p class="text-gray-600 mb-3 line-clamp-2">{{ problem.shortDescription }}</p>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                  <div>
                    <span class="font-medium">开始时间:</span>
                    {{ formatDate(problem.startTime) }}
                  </div>
                  <div>
                    <span class="font-medium">结束时间:</span>
                    {{ formatDate(problem.endTime) }}
                  </div>
                  <div>
                    <span class="font-medium">提交数:</span>
                    {{ problem._count?.submissions || 0 }}
                  </div>
                </div>

                <div class="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                  <span v-if="problem.datasetUrl">数据集: 已上传</span>
                  <span v-else>数据集: 未上传</span>
                  <span v-if="problem.judgingScriptUrl">评测脚本: 已上传</span>
                  <span v-else>评测脚本: 未上传</span>
                </div>
              </div>

              <div class="flex flex-col space-y-2 ml-6">
                <NuxtLink
                  :to="`/problems/${problem.id}`"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
                >
                  查看详情
                </NuxtLink>
                <NuxtLink
                  :to="`/admin/problems/${problem.id}/edit`"
                  class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
                >
                  编辑
                </NuxtLink>
                <button
                  @click="deleteProblem(problem.id)"
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
          <div class="text-gray-400 text-6xl mb-4">📝</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">暂无题目</h3>
          <p class="text-gray-600 mb-6">为这个竞赛添加第一个题目吧！</p>
          <button
            @click="showCreateForm = true"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
          >
            添加题目
          </button>
        </div>
      </div>
    </div>

    <!-- 创建题目模态框 -->
    <div v-if="showCreateForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">添加题目</h3>
          <button @click="showCreateForm = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form @submit.prevent="createProblem" class="space-y-4">
          <div v-if="createError" class="bg-red-50 border border-red-200 rounded-md p-4">
            <p class="text-red-800">{{ createError }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">题目标题 *</label>
            <input
              v-model="createForm.title"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="输入题目标题"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">简短描述 *</label>
            <textarea
              v-model="createForm.shortDescription"
              rows="3"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="简要描述题目内容（10-500字符）"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">详细描述 *</label>
            <textarea
              v-model="createForm.detailedDescription"
              rows="6"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="详细描述题目要求、数据格式、评分标准等（50-10000字符）"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">开始时间 *</label>
              <input
                v-model="createForm.startTime"
                type="datetime-local"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">结束时间 *</label>
              <input
                v-model="createForm.endTime"
                type="datetime-local"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showCreateForm = false"
              class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="isCreating"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
            >
              {{ isCreating ? '创建中...' : '创建题目' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Competition {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  creator: {
    id: string
    username: string
  }
  problems: Problem[]
}

interface Problem {
  id: string
  title: string
  shortDescription: string
  startTime: string
  endTime: string
  status: string
  datasetUrl?: string
  judgingScriptUrl?: string
  _count: {
    submissions: number
  }
}

interface CompetitionResponse {
  success: boolean
  competition: Competition
}

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const competitionId = route.params.id as string

// 获取竞赛数据
const { data, pending, error, refresh } = await useFetch<CompetitionResponse>(`/api/competitions/${competitionId}`)

const problems = computed(() => {
  if (!data.value?.competition?.problems) return []

  const now = new Date()
  return data.value.competition.problems.map(problem => {
    let status = 'upcoming'
    if (problem.startTime <= now.toISOString() && problem.endTime > now.toISOString()) {
      status = 'ongoing'
    } else if (problem.endTime <= now.toISOString()) {
      status = 'ended'
    }
    return { ...problem, status }
  })
})

// 创建题目相关状态
const showCreateForm = ref(false)
const isCreating = ref(false)
const createError = ref('')

const createForm = reactive({
  title: '',
  shortDescription: '',
  detailedDescription: '',
  startTime: '',
  endTime: ''
})

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 将 datetime-local 的值（视为本地时间）正确转换为 UTC 时间字符串
function convertLocalToUTC(localTimeString: string): string {
  // localTimeString 格式为 "YYYY-MM-DDTHH:mm"
  const [datePart, timePart] = localTimeString.split('T')
  const [year, month, day] = datePart.split('-')
  const [hours, minutes] = timePart.split(':')

  // 创建本地时间的 Date 对象
  const localDate = new Date(
    parseInt(year),
    parseInt(month) - 1, // 月份从0开始
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  )

  // 转换为 ISO 字符串（UTC 时间）
  return localDate.toISOString()
}

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'upcoming': '即将开始',
    'ongoing': '进行中',
    'ended': '已结束'
  }
  return statusMap[status] || status
}

const createProblem = async () => {
  if (isCreating.value) return

  createError.value = ''
  isCreating.value = true

  try {
    // 验证时间
    const startDate = new Date(createForm.startTime)
    const endDate = new Date(createForm.endTime)

    if (startDate >= endDate) {
      createError.value = '结束时间必须晚于开始时间'
      return
    }

    const result = await $fetch(`/api/competitions/${competitionId}/problems`, {
      method: 'POST',
      body: {
        title: createForm.title,
        shortDescription: createForm.shortDescription,
        detailedDescription: createForm.detailedDescription,
        startTime: convertLocalToUTC(createForm.startTime),
        endTime: convertLocalToUTC(createForm.endTime)
      }
    })

    if (result.success) {
      // 重置表单
      Object.keys(createForm).forEach(key => {
        (createForm as any)[key] = ''
      })

      showCreateForm.value = false
      await refresh() // 刷新数据
    }

  } catch (err: any) {
    createError.value = err.data?.message || err.message || '创建题目失败'
  } finally {
    isCreating.value = false
  }
}

const deleteProblem = async (problemId: string) => {
  if (!confirm('确定要删除这个题目吗？此操作不可撤销。')) {
    return
  }

  try {
    await $fetch(`/api/problems/${problemId}`, {
      method: 'DELETE'
    })

    await refresh() // 刷新数据
    alert('题目删除成功')
  } catch (error: any) {
    console.error('删除题目失败:', error)
    alert('删除题目失败: ' + (error.data?.message || error.message))
  }
}

// 设置默认时间为比赛的开始和结束时间
watch(data, (newData) => {
  if (newData?.competition) {
    const competition = newData.competition
    const startDate = new Date(competition.startTime)
    const endDate = new Date(competition.endTime)

    // 调整为本地时间显示
    createForm.startTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    createForm.endTime = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
}, { immediate: true })
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
