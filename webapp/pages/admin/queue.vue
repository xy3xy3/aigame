<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 面包屑导航 -->
    <nav class="mb-4 text-sm">
      <ol class="flex items-center space-x-2 text-gray-500">
        <li>
          <NuxtLink to="/admin/dashboard" class="hover:text-blue-600">管理后台</NuxtLink>
        </li>
        <li class="flex items-center">
          <svg class="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </li>
        <li class="text-gray-900">评测队列</li>
      </ol>
    </nav>

    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">评测队列</h1>
      <p class="mt-2 text-gray-600">查看各状态下的评测任务</p>
    </div>

    <!-- Tabs -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-2">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(item, index) in tabItems"
          :key="item.key"
          @click="onTabChange(index)"
          class="px-4 py-2 text-sm font-medium rounded-md focus:outline-none"
          :class="{
            'bg-blue-600 hover:bg-blue-700 text-white': selectedTab === index,
            'bg-gray-100 text-gray-700 hover:bg-gray-200': selectedTab !== index
          }"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <!-- 列表卡片 -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="pending">
              <td :colspan="columns.length" class="px-6 py-4 text-center text-gray-500">
                加载中...
              </td>
            </tr>
            <tr v-else-if="jobs.length === 0">
              <td :colspan="columns.length" class="px-6 py-4 text-center text-gray-500">
                暂无数据
              </td>
            </tr>
            <template v-else v-for="job in jobs" :key="job.id">
              <tr class="hover:bg-gray-50">
                <td
                  v-for="column in columns"
                  :key="column.key"
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                >
                  <!-- 自定义渲染 data 列 -->
                  <template v-if="column.key === 'data'">
                    <pre class="text-xs">{{ JSON.stringify(job.data, null, 2) }}</pre>
                  </template>
                  <!-- 自定义渲染 timestamp 列 -->
                  <template v-else-if="column.key === 'timestamp'">
                    <span>{{ new Date(job.timestamp).toLocaleString() }}</span>
                  </template>
                  <!-- 默认渲染 -->
                  <template v-else>
                    {{ job[column.key] }}
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="data?.pagination && data.pagination.totalPages > 1" class="mt-6">
      <Pagination
        :current-page="data.pagination.page"
        :total-pages="data.pagination.totalPages"
        :total-items="data.pagination.total"
        :items-per-page="data.pagination.limit"
        @page-change="goToPage"
        @items-per-page-change="changeItemsPerPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Pagination from "~/components/common/Pagination.vue";

definePageMeta({
  middleware: "admin",
});

const route = useRoute()
const router = useRouter()

const tabItems = [
  { label: '等待中', key: 'waiting' },
  { label: '进行中', key: 'active' },
  { label: '已完成', key: 'completed' },
  { label: '失败', key: 'failed' },
]

const selectedTab = ref(tabItems.findIndex(item => item.key === (route.query.tab || 'waiting')))

const page = ref(Number(route.query.page) || 1)
const pageSize = ref(10)

interface Job {
  id: string
  name: string
  data: any
  timestamp: number
  state: string
}

const { data, pending, refresh } = useFetch<{ jobs: Job[] }>('/api/admin/queue/jobs', {
  query: {
    types: computed(() => tabItems[selectedTab.value]?.key),
    page,
    pageSize,
  },
})

const jobs = computed(() => data.value?.jobs || [])

function onTabChange(index: number) {
  selectedTab.value = index
  page.value = 1
  const selected = tabItems[index]
  if (selected) {
    router.push({ query: { tab: selected.key } })
  }
}

watch(page, () => {
  refresh()
})

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '名称' },
  { key: 'data', label: '数据' },
  { key: 'timestamp', label: '创建时间' },
  { key: 'state', label: '状态' },
]

// Pagination methods
const goToPage = (newPage: number) => {
  page.value = newPage;
  refresh();
};

const changeItemsPerPage = (newItemsPerPage: number) => {
  pageSize.value = newItemsPerPage;
  page.value = 1; // Reset to first page
  refresh();
};
</script>
