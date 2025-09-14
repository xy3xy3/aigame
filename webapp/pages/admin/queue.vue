<template>
  <div class="p-4 sm:p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        评测队列
      </h1>
    </div>

    <!-- Tabs -->
    <div class="mt-4 flex space-x-2 border-b border-gray-200">
      <button
        v-for="(item, index) in tabItems"
        :key="item.key"
        @click="onTabChange(index)"
        class="px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none"
        :class="{
          'bg-blue-500 text-white': selectedTab === index,
          'bg-gray-100 text-gray-700 hover:bg-gray-200': selectedTab !== index
        }"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="mt-4">
      <!-- Card -->
      <div class="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th v-for="column in columns" :key="column.key" scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <td v-for="column in columns" :key="column.key" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <!-- Custom cell rendering for 'data' column -->
                    <template v-if="column.key === 'data'">
                      <pre class="text-xs">{{ JSON.stringify(job.data, null, 2) }}</pre>
                    </template>
                    <!-- Custom cell rendering for 'timestamp' column -->
                    <template v-else-if="column.key === 'timestamp'">
                      <span>{{ new Date(job.timestamp).toLocaleString() }}</span>
                    </template>
                    <!-- Default cell rendering -->
                    <template v-else>
                      {{ job[column.key] }}
                    </template>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="data?.pagination && data.pagination.totalPages > 1" class="mt-4 flex justify-end">
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