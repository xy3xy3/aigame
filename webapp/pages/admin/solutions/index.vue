<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 面包屑导航 -->
    <nav class="mb-4 text-sm">
      <ol class="flex items-center space-x-2 text-gray-500">
        <li>
          <NuxtLink to="/admin/dashboard" class="hover:text-indigo-600"
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
        <li class="text-gray-900">题解管理</li>
      </ol>
    </nav>

    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">题解管理</h1>
        <p class="mt-2 text-gray-600">查看和管理所有用户提交的题解</p>
      </div>
      <button
        @click="openBatchDownloadModal"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
      >
        批量下载
      </button>
    </div>

    <!-- 筛选器 -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-4">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">比赛筛选</label>
          <select
            v-model="selectedCompetitionId"
            @change="fetchSolutions"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部比赛</option>
            <option
              v-for="competition in competitions"
              :key="competition.id"
              :value="competition.id"
            >
              {{ competition.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">队伍筛选</label>
          <select
            v-model="selectedTeamId"
            @change="fetchSolutions"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部队伍</option>
            <option v-for="team in teams" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">搜索</label>
          <input
            v-model="searchQuery"
            @input="debounceSearch"
            type="text"
            placeholder="搜索文件名..."
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
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

    <!-- 加载状态 -->
    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 题解列表 -->
    <div
      v-else-if="data?.solutions"
      class="bg-white rounded-lg shadow-md overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                文件名
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                提交者
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                队伍
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                比赛
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                文件大小
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                提交时间
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="solution in data.solutions"
              :key="solution.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 mr-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  {{ solution.fileName }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div class="font-medium">{{ solution.user.username }}</div>
                  <div class="text-xs text-gray-400" v-if="solution.user.realName">
                    {{ solution.user.realName }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ solution.team?.name || "-" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ solution.competition?.title || "-" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatFileSize(solution.fileSize) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(solution.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <a
                    :href="getDirectDownloadUrl(solution.fileUrl)"
                    target="_blank"
                    class="text-indigo-600 hover:text-indigo-900"
                  >
                    下载
                  </a>
                  <button
                    @click="viewSolutionDetails(solution)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    详情
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 text-6xl mb-4">📝</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无题解</h3>
      <p class="text-gray-600">当前筛选条件下没有找到题解</p>
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

    <!-- 题解详情模态框 -->
    <div v-if="showDetailModal" class="fixed inset-0 overflow-y-auto z-50">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div
            @click="closeDetailModal"
            class="absolute inset-0 bg-gray-500 opacity-75"
          ></div>
        </div>

        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
          >&#8203;</span
        >

        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">题解详情</h3>
                <div v-if="selectedSolution" class="mt-2 space-y-3">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700"
                        >文件名</label
                      >
                      <p class="text-sm text-gray-900">{{ selectedSolution.fileName }}</p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700"
                        >文件大小</label
                      >
                      <p class="text-sm text-gray-900">
                        {{ formatFileSize(selectedSolution.fileSize) }}
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700"
                        >文件类型</label
                      >
                      <p class="text-sm text-gray-900">{{ selectedSolution.mimeType }}</p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700"
                        >提交时间</label
                      >
                      <p class="text-sm text-gray-900">
                        {{ formatDate(selectedSolution.createdAt) }}
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700"
                        >提交者</label
                      >
                      <p class="text-sm text-gray-900">
                        {{ selectedSolution.user.username }}
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700">队伍</label>
                      <p class="text-sm text-gray-900">
                        {{ selectedSolution.team?.name || "-" }}
                      </p>
                    </div>
                    <div class="col-span-2">
                      <label class="block text-sm font-medium text-gray-700">比赛</label>
                      <p class="text-sm text-gray-900">
                        {{ selectedSolution.competition?.title || "-" }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <a
              :href="getDirectDownloadUrl(selectedSolution.fileUrl)"
              target="_blank"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              下载题解
            </a>
            <button
              @click="closeDetailModal"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量下载模态框 -->
    <div v-if="showBatchDownloadModal" class="fixed inset-0 overflow-y-auto z-50">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div
            @click="closeBatchDownloadModal"
            class="absolute inset-0 bg-gray-500 opacity-75"
          ></div>
        </div>

        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
          >&#8203;</span
        >

        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  批量下载题解
                </h3>
                <div class="mt-2">
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >选择比赛</label
                    >
                    <select
                      v-model="selectedBatchCompetitionId"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">请选择比赛</option>
                      <option
                        v-for="competition in competitions"
                        :key="competition.id"
                        :value="competition.id"
                      >
                        {{ competition.title }}
                      </option>
                    </select>
                  </div>
                  <div v-if="selectedBatchCompetitionId" class="text-sm text-gray-600">
                    <p>将下载选中比赛的所有题解文件，打包为ZIP格式</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="downloadBatchSolutions"
              type="button"
              :disabled="!selectedBatchCompetitionId || isBatchDownloading"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {{ isBatchDownloading ? "下载中..." : "开始下载" }}
            </button>
            <button
              @click="closeBatchDownloadModal"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Pagination from "~/components/common/Pagination.vue";

definePageMeta({
  middleware: "admin",
});

// 筛选参数
const selectedCompetitionId = ref("");
const selectedTeamId = ref("");
const searchQuery = ref("");
const currentPage = ref(1);

// 模态框状态
const showDetailModal = ref(false);
const selectedSolution = ref(null);
const showBatchDownloadModal = ref(false);
const selectedBatchCompetitionId = ref("");
const isBatchDownloading = ref(false);

// 下拉选项数据
const competitions = ref([]);
const teams = ref([]);

// URL query 参数处理
const route = useRoute();
if (route.query.competitionId) {
  selectedCompetitionId.value = route.query.competitionId;
}
if (route.query.teamId) {
  selectedTeamId.value = route.query.teamId;
}

// 构建查询参数
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: 20,
  competitionId: selectedCompetitionId.value || undefined,
  teamId: selectedTeamId.value || undefined,
  search: searchQuery.value || undefined,
}));

// 数据获取
const { data, pending, error, refresh } = await useFetch("/api/admin/solutions", {
  query: queryParams,
});

// 获取比赛列表用于筛选
const { data: competitionsData } = await useFetch("/api/competitions", {
  query: { limit: 100 },
});

// 获取队伍列表用于筛选
const { data: teamsData } = await useFetch("/api/admin/teams", {
  query: { limit: 100 },
});

// 设置下拉选项
if (competitionsData.value?.competitions) {
  competitions.value = competitionsData.value.competitions;
}
if (teamsData.value?.teams) {
  teams.value = teamsData.value.teams;
}

const fetchSolutions = () => {
  currentPage.value = 1;
  refresh();
};

// 搜索防抖
let searchTimeout = null;
const debounceSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    fetchSolutions();
  }, 500);
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

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 获取直接下载URL
const getDirectDownloadUrl = (fileUrl) => {
  // fileUrl 格式：aigame/solutions/competitionId/teamId/filename.pdf
  const [bucketName, ...pathParts] = fileUrl.split("/");
  const objectName = pathParts.join("/");

  // 使用MinIO的公共URL格式
  const config = useRuntimeConfig();
  const baseUrl = config.public.minioPublicUrl || "http://localhost:9000";
  return `${baseUrl}/${bucketName}/${objectName}`;
};

// 批量下载功能
const openBatchDownloadModal = () => {
  showBatchDownloadModal.value = true;
};

const closeBatchDownloadModal = () => {
  showBatchDownloadModal.value = false;
  selectedBatchCompetitionId.value = "";
};

const downloadBatchSolutions = async () => {
  if (!selectedBatchCompetitionId.value) return;

  isBatchDownloading.value = true;
  try {
    // 获取选中比赛的所有题解ID
    const solutionsResponse = await $fetch("/api/admin/solutions", {
      query: {
        competitionId: selectedBatchCompetitionId.value,
        limit: 1000, // 获取所有题解
      },
    });

    if (!solutionsResponse.solutions || solutionsResponse.solutions.length === 0) {
      push.warning("该比赛没有题解可下载");
      return;
    }

    const solutionIds = solutionsResponse.solutions.map((s) => s.id);

    const response = await $fetch("/api/admin/solutions/download", {
      method: "POST",
      body: {
        solutionIds,
        filename: `solutions_${
          competitions.value.find((c) => c.id === selectedBatchCompetitionId.value)
            ?.title || "batch"
        }`,
      },
    });

    if (response) {
      // 创建Blob并下载
      const blob = new Blob([response], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `solutions_batch_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      push.success("批量下载成功");
      closeBatchDownloadModal();
    }
  } catch (error) {
    console.error("批量下载失败:", error);
    push.error("批量下载失败: " + (error.data?.message || error.message));
  } finally {
    isBatchDownloading.value = false;
  }
};

const viewSolutionDetails = (solution) => {
  selectedSolution.value = solution;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedSolution.value = null;
};

// 监听路由变化，更新筛选条件
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.competitionId !== selectedCompetitionId.value) {
      selectedCompetitionId.value = newQuery.competitionId || "";
      fetchSolutions();
    }
    if (newQuery.teamId !== selectedTeamId.value) {
      selectedTeamId.value = newQuery.teamId || "";
      fetchSolutions();
    }
  },
  { immediate: false }
);
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
