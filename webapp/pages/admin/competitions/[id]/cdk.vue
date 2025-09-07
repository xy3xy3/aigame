<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 面包屑导航 -->
    <nav class="mb-4 text-sm">
      <ol class="flex items-center space-x-2 text-gray-500">
        <li>
          <NuxtLink to="/admin/dashboard" class="hover:text-blue-600"
            >管理后台</NuxtLink
          >
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
        <li>
          <NuxtLink to="/admin/competitions" class="hover:text-blue-600"
            >比赛管理</NuxtLink
          >
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
        <li class="text-gray-900">CDK 管理</li>
      </ol>
    </nav>

    <!-- 页面标题 -->
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">CDK 管理</h1>
        <p v-if="competition" class="mt-1 text-gray-600">比赛：{{ competition.title }}</p>
      </div>
      <NuxtLink
        to="/admin/competitions"
        class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
      >
        返回比赛列表
      </NuxtLink>
    </div>

    <!-- 统计卡片 -->
    <div v-if="data?.stats" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">可用</p>
            <p class="text-2xl font-semibold text-gray-900">{{ data.stats.available }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                ></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">已领取</p>
            <p class="text-2xl font-semibold text-gray-900">{{ data.stats.claimed }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                class="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">作废</p>
            <p class="text-2xl font-semibold text-gray-900">{{ data.stats.void }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                ></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">总数</p>
            <p class="text-2xl font-semibold text-gray-900">{{ data.stats.total }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量导入区域 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">批量导入 CDK</h3>
      <form @submit.prevent="importCdks">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div class="lg:col-span-2">
            <label for="cdk-codes" class="block text-sm font-medium text-gray-700 mb-1">
              CDK 代码 *
            </label>
            <textarea
              id="cdk-codes"
              v-model="importForm.codes"
              rows="4"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="每行一个CDK代码，例如：&#10;ABCD1234&#10;EFGH5678&#10;IJKL9012"
            ></textarea>
            <p class="mt-1 text-sm text-gray-500">
              每行输入一个CDK代码，系统会自动去除重复和空行
            </p>
          </div>
          <div class="space-y-4">
            <div>
              <label for="batch-id" class="block text-sm font-medium text-gray-700 mb-1">
                批次ID
              </label>
              <input
                id="batch-id"
                v-model="importForm.batchId"
                type="text"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例如：batch-001"
              />
              <p class="mt-1 text-sm text-gray-500">用于批量管理，不填写则自动生成</p>
            </div>
            <div>
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <input
                id="notes"
                v-model="importForm.notes"
                type="text"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="备注信息"
              />
            </div>
            <button
              type="submit"
              :disabled="isImporting || !importForm.codes.trim()"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {{ isImporting ? "导入中..." : "导入 CDK" }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- 筛选和搜索 -->
    <div class="bg-white rounded-lg shadow-md p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">状态筛选</label>
          <select
            v-model="selectedStatus"
            @change="fetchCdks"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="AVAILABLE">可用</option>
            <option value="CLAIMED">已领取</option>
            <option value="VOID">作废</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">批次筛选</label>
          <select
            v-model="selectedBatch"
            @change="fetchCdks"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部批次</option>
            <option v-for="batch in data?.batches" :key="batch.id" :value="batch.id">
              {{ batch.id }} ({{ formatDate(batch.createdAt) }})
            </option>
          </select>
        </div>
        <div class="flex-1 min-w-48">
          <label class="block text-sm font-medium text-gray-700 mb-1">搜索CDK</label>
          <input
            v-model="searchQuery"
            @input="debounceSearch"
            type="text"
            placeholder="输入CDK代码搜索..."
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
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

    <!-- 批量操作 -->
    <div
      v-if="selectedCdks.length > 0"
      class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg
            class="w-5 h-5 text-yellow-400 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            ></path>
          </svg>
          <span class="text-sm font-medium text-yellow-800">
            已选择 {{ selectedCdks.length }} 个CDK
          </span>
        </div>
        <div class="flex space-x-2">
          <button
            @click="bulkVoidCdks"
            :disabled="isBulkOperating"
            class="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
          >
            {{ isBulkOperating ? "处理中..." : "批量作废" }}
          </button>
          <button
            @click="bulkDeleteCdks"
            :disabled="isBulkOperating"
            class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
          >
            {{ isBulkOperating ? "处理中..." : "批量删除" }}
          </button>
          <button
            @click="clearSelection"
            class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium"
          >
            取消选择
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- CDK 列表 -->
    <div v-else-if="data?.cdks" class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="px-4 py-5 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">CDK 列表</h3>
          <div class="flex items-center space-x-2">
            <label class="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mr-2"
              />
              全选当前页
            </label>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  选择
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  CDK代码
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  状态
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  关联对象
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  批次
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  创建时间
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="cdk in data.cdks" :key="cdk.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    :value="cdk.id"
                    v-model="selectedCdks"
                    class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <span class="text-sm font-mono text-gray-900">{{ cdk.code }}</span>
                    <button
                      @click="copyCdkCode(cdk.code)"
                      class="ml-2 text-gray-400 hover:text-gray-600"
                      title="复制CDK代码"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="{
                      'bg-green-100 text-green-800': cdk.status === 'AVAILABLE',
                      'bg-blue-100 text-blue-800': cdk.status === 'CLAIMED',
                      'bg-red-100 text-red-800': cdk.status === 'VOID',
                    }"
                    class="px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {{ getStatusText(cdk.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div v-if="cdk.status === 'CLAIMED'">
                    <div v-if="cdk.team" class="text-blue-600">
                      团队: {{ cdk.team.name }}
                    </div>
                    <div v-if="cdk.user" class="text-green-600">
                      用户: {{ cdk.user.username }}
                    </div>
                    <div v-if="cdk.claimedByUser" class="text-gray-500 text-xs">
                      领取人: {{ cdk.claimedByUser.username }}
                    </div>
                  </div>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ cdk.batchId || "-" }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(cdk.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex space-x-2">
                    <button
                      v-if="cdk.status === 'AVAILABLE'"
                      @click="voidCdk(cdk.id)"
                      class="text-orange-600 hover:text-orange-900"
                      title="作废CDK"
                    >
                      作废
                    </button>
                    <button
                      @click="deleteCdk(cdk.id)"
                      class="text-red-600 hover:text-red-900"
                      title="删除CDK"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 text-6xl mb-4">🎟️</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无CDK</h3>
      <p class="text-gray-600 mb-6">开始导入你的第一批CDK吧！</p>
    </div>

    <!-- 分页 -->
    <div
      v-if="data?.pagination && data.pagination.total > data.pagination.limit"
      class="mt-6"
    >
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

<script setup>
import Pagination from "~/components/common/Pagination.vue";

definePageMeta({
  middleware: "admin",
});

const route = useRoute();
const competitionId = route.params.id;

// 获取比赛信息
const { data: competition } = await useFetch(`/api/admin/competitions/${competitionId}`);

// 筛选和搜索
const selectedStatus = ref("");
const selectedBatch = ref("");
const searchQuery = ref("");
const currentPage = ref(1);

// 获取CDK列表
const { data, pending, error, refresh } = await useFetch(
  `/api/admin/competitions/${competitionId}/cdk`,
  {
    query: {
      status: selectedStatus,
      batchId: selectedBatch,
      search: searchQuery,
      page: currentPage,
      limit: 20,
    },
  }
);

// 批量导入
const importForm = ref({
  codes: "",
  batchId: "",
  notes: "",
});
const isImporting = ref(false);

// 批量操作
const selectedCdks = ref([]);
const isBulkOperating = ref(false);

// 搜索防抖
let searchTimeout = null;
const debounceSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    refresh();
  }, 500);
};

const fetchCdks = () => {
  currentPage.value = 1;
  refresh();
};

const goToPage = (page) => {
  currentPage.value = page;
  refresh();
};

const changeItemsPerPage = (newItemsPerPage) => {
  data.value.pagination.limit = newItemsPerPage;
  currentPage.value = 1;
  refresh();
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("zh-CN");
};

const getStatusText = (status) => {
  const statusMap = {
    AVAILABLE: "可用",
    CLAIMED: "已领取",
    VOID: "作废",
  };
  return statusMap[status] || status;
};

// 复制CDK代码
const copyCdkCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code);
    push.success("CDK代码已复制到剪贴板");
  } catch (err) {
    console.error("复制失败:", err);
    push.error("复制失败，请手动复制");
  }
};

// 批量导入CDK
const importCdks = async () => {
  if (isImporting.value || !importForm.value.codes.trim()) return;

  isImporting.value = true;

  try {
    const codes = importForm.value.codes
      .split("\n")
      .map((code) => code.trim())
      .filter((code) => code.length > 0);

    if (codes.length === 0) {
      push.error("请输入至少一个CDK代码");
      isImporting.value = false;
      return;
    }

    const response = await $fetch(`/api/admin/competitions/${competitionId}/cdk/import`, {
      method: "POST",
      body: {
        codes,
        batchId: importForm.value.batchId.trim() || undefined,
        notes: importForm.value.notes.trim() || undefined,
      },
    });

    if (response.success) {
      push.success(
        `成功导入 ${response.imported.successful} 个CDK，跳过 ${response.imported.duplicates} 个重复的CDK`
      );
      importForm.value.codes = "";
      importForm.value.batchId = "";
      importForm.value.notes = "";
      await refresh();
    } else {
      push.error("导入CDK失败");
    }
  } catch (err) {
    console.error("导入CDK时出错:", err);
    push.error("导入CDK时出错: " + (err.data?.message || err.message || "未知错误"));
  } finally {
    isImporting.value = false;
  }
};

// 选择相关
const isAllSelected = computed(() => {
  return (
    data.value?.cdks?.length > 0 && selectedCdks.value.length === data.value.cdks.length
  );
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedCdks.value = [];
  } else {
    selectedCdks.value = data.value?.cdks?.map((cdk) => cdk.id) || [];
  }
};

const clearSelection = () => {
  selectedCdks.value = [];
};

// 单个操作
const voidCdk = async (cdkId) => {
  if (!confirm("确定要作废这个CDK吗？")) return;

  try {
    const response = await $fetch(
      `/api/admin/competitions/${competitionId}/cdk/bulk-void`,
      {
        method: "POST",
        body: { cdkIds: [cdkId] },
      }
    );

    if (response.success) {
      push.success("CDK作废成功");
      await refresh();
    } else {
      push.error("CDK作废失败");
    }
  } catch (err) {
    console.error("作废CDK时出错:", err);
    push.error("作废CDK时出错: " + (err.data?.message || err.message || "未知错误"));
  }
};

const deleteCdk = async (cdkId) => {
  if (!confirm("确定要删除这个CDK吗？此操作不可撤销。")) return;

  try {
    const response = await $fetch(
      `/api/admin/competitions/${competitionId}/cdk/bulk-delete`,
      {
        method: "DELETE",
        body: { cdkIds: [cdkId] },
      }
    );

    if (response.success) {
      push.success("CDK删除成功");
      await refresh();
    } else {
      push.error("CDK删除失败");
    }
  } catch (err) {
    console.error("删除CDK时出错:", err);
    push.error("删除CDK时出错: " + (err.data?.message || err.message || "未知错误"));
  }
};

// 批量操作
const bulkVoidCdks = async () => {
  if (selectedCdks.value.length === 0) return;
  if (!confirm(`确定要作废选中的 ${selectedCdks.value.length} 个CDK吗？`)) return;

  isBulkOperating.value = true;

  try {
    const response = await $fetch(
      `/api/admin/competitions/${competitionId}/cdk/bulk-void`,
      {
        method: "POST",
        body: { cdkIds: selectedCdks.value },
      }
    );

    if (response.success) {
      push.success(`成功作废 ${response.affected} 个CDK`);
      selectedCdks.value = [];
      await refresh();
    } else {
      push.error("批量作废CDK失败");
    }
  } catch (err) {
    console.error("批量作废CDK时出错:", err);
    push.error("批量作废CDK时出错: " + (err.data?.message || err.message || "未知错误"));
  } finally {
    isBulkOperating.value = false;
  }
};

const bulkDeleteCdks = async () => {
  if (selectedCdks.value.length === 0) return;
  if (!confirm(`确定要删除选中的 ${selectedCdks.value.length} 个CDK吗？此操作不可撤销。`))
    return;

  isBulkOperating.value = true;

  try {
    const response = await $fetch(
      `/api/admin/competitions/${competitionId}/cdk/bulk-delete`,
      {
        method: "DELETE",
        body: { cdkIds: selectedCdks.value },
      }
    );

    if (response.success) {
      push.success(`成功删除 ${response.affected} 个CDK`);
      selectedCdks.value = [];
      await refresh();
    } else {
      push.error("批量删除CDK失败");
    }
  } catch (err) {
    console.error("批量删除CDK时出错:", err);
    push.error("批量删除CDK时出错: " + (err.data?.message || err.message || "未知错误"));
  } finally {
    isBulkOperating.value = false;
  }
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
