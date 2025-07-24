<template>
  <div class="max-w-4xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">创建题目</h1>
      <p class="mt-2 text-gray-600">为竞赛添加新的题目</p>
    </div>

    <form @submit.prevent="handleSubmit" class="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <div v-if="success" class="bg-green-50 border border-green-200 rounded-md p-4">
        <p class="text-green-800">题目创建成功！</p>
      </div>

      <!-- 选择竞赛 -->
      <div>
        <label for="competitionId" class="block text-sm font-medium text-gray-700 mb-2">
          所属竞赛 *
        </label>
        <select
          id="competitionId"
          v-model="form.competitionId"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">请选择竞赛</option>
          <option
            v-for="competition in competitions"
            :key="competition.id"
            :value="competition.id"
          >
            {{ competition.title }}
          </option>
        </select>
      </div>

      <!-- 题目标题 -->
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
          题目标题 *
        </label>
        <input
          id="title"
          v-model="form.title"
          type="text"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="输入题目标题"
        >
      </div>

      <!-- 简短描述 -->
      <div>
        <label for="shortDescription" class="block text-sm font-medium text-gray-700 mb-2">
          简短描述 *
        </label>
        <textarea
          id="shortDescription"
          v-model="form.shortDescription"
          rows="3"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="简要描述题目内容（10-500字符）"
        ></textarea>
        <p class="mt-1 text-sm text-gray-500">{{ form.shortDescription.length }}/500 字符</p>
      </div>

      <!-- 详细描述 -->
      <div>
        <label for="detailedDescription" class="block text-sm font-medium text-gray-700 mb-2">
          详细描述 *
        </label>
        <textarea
          id="detailedDescription"
          v-model="form.detailedDescription"
          rows="8"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="详细描述题目要求、数据格式、评分标准等（50-10000字符）"
        ></textarea>
        <p class="mt-1 text-sm text-gray-500">{{ form.detailedDescription.length }}/10000 字符</p>
      </div>

      <!-- 数据集URL -->
      <div>
        <label for="datasetUrl" class="block text-sm font-medium text-gray-700 mb-2">
          数据集URL
        </label>
        <input
          id="datasetUrl"
          v-model="form.datasetUrl"
          type="url"
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://example.com/dataset.zip"
        >
      </div>

      <!-- 评测脚本URL -->
      <div>
        <label for="judgingScriptUrl" class="block text-sm font-medium text-gray-700 mb-2">
          评测脚本URL
        </label>
        <input
          id="judgingScriptUrl"
          v-model="form.judgingScriptUrl"
          type="url"
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://example.com/judge.py"
        >
      </div>

      <!-- 时间设置 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="startTime" class="block text-sm font-medium text-gray-700 mb-2">
            开始时间 *
          </label>
          <input
            id="startTime"
            v-model="form.startTime"
            type="datetime-local"
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
        </div>

        <div>
          <label for="endTime" class="block text-sm font-medium text-gray-700 mb-2">
            结束时间 *
          </label>
          <input
            id="endTime"
            v-model="form.endTime"
            type="datetime-local"
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-end space-x-4">
        <NuxtLink
          to="/admin/problems"
          class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium"
        >
          取消
        </NuxtLink>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
        >
          {{ isSubmitting ? '创建中...' : '创建题目' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
interface Competition {
  id: string
  title: string
}

interface CompetitionsResponse {
  success: boolean
  competitions: Competition[]
}

definePageMeta({
  middleware: 'auth'
})

// 获取竞赛列表
const { data: competitionsData } = await useFetch<CompetitionsResponse>('/api/competitions/simple')
const competitions = computed(() => competitionsData.value?.competitions || [])

const form = reactive({
  competitionId: '',
  title: '',
  shortDescription: '',
  detailedDescription: '',
  datasetUrl: '',
  judgingScriptUrl: '',
  startTime: '',
  endTime: ''
})

const isSubmitting = ref(false)
const error = ref('')
const success = ref(false)

const handleSubmit = async () => {
  if (isSubmitting.value) return

  error.value = ''
  success.value = false
  isSubmitting.value = true

  try {
    // 验证时间
    const startDate = new Date(form.startTime)
    const endDate = new Date(form.endTime)

    if (startDate >= endDate) {
      error.value = '结束时间必须晚于开始时间'
      return
    }

    // 验证字符长度
    if (form.shortDescription.length < 10 || form.shortDescription.length > 500) {
      error.value = '简短描述必须在10-500字符之间'
      return
    }

    if (form.detailedDescription.length < 50 || form.detailedDescription.length > 10000) {
      error.value = '详细描述必须在50-10000字符之间'
      return
    }

    const data = await $fetch(`/api/competitions/${form.competitionId}/problems`, {
      method: 'POST',
      body: {
        title: form.title,
        shortDescription: form.shortDescription,
        detailedDescription: form.detailedDescription,
        datasetUrl: form.datasetUrl || undefined,
        judgingScriptUrl: form.judgingScriptUrl || undefined,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
      }
    })

    if (data.success) {
      success.value = true
      // 重置表单
      Object.keys(form).forEach(key => {
        form[key] = ''
      })

      // 3秒后跳转到题目列表
      setTimeout(() => {
        navigateTo('/admin/problems')
      }, 3000)
    }

  } catch (err: any) {
    error.value = err.data?.message || err.message || '创建题目失败'
  } finally {
    isSubmitting.value = false
  }
}

// 设置默认时间（当前时间+1小时作为开始时间，+25小时作为结束时间）
onMounted(() => {
  const now = new Date()
  const start = new Date(now.getTime() + 60 * 60 * 1000) // +1小时
  const end = new Date(now.getTime() + 25 * 60 * 60 * 1000) // +25小时

  form.startTime = start.toISOString().slice(0, 16)
  form.endTime = end.toISOString().slice(0, 16)
})
</script>
