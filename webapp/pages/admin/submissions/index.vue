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
        <li class="text-gray-900">提交管理</li>
      </ol>
    </nav>

    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">提交管理</h1>
      <p class="mt-2 text-gray-600">查看和管理所有用户的提交记录</p>
    </div>

    <!-- 搜索和筛选 -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label for="search-id" class="block text-sm font-medium text-gray-700 mb-1"
            >提交ID</label
          >
          <input
            id="search-id"
            v-model="searchId"
            type="text"
            placeholder="输入提交ID"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @keyup.enter="searchSubmissions"
          />
        </div>
        <div>
          <label for="search-user" class="block text-sm font-medium text-gray-700 mb-1"
            >用户名</label
          >
          <input
            id="search-user"
            v-model="searchUser"
            type="text"
            placeholder="输入用户名"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @keyup.enter="searchSubmissions"
          />
        </div>
        <div>
          <label for="search-team" class="block text-sm font-medium text-gray-700 mb-1"
            >队伍名</label
          >
          <input
            id="search-team"
            v-model="searchTeam"
            type="text"
            placeholder="输入队伍名"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @keyup.enter="searchSubmissions"
          />
        </div>
        <div>
          <label for="search-problem" class="block text-sm font-medium text-gray-700 mb-1"
            >题目标题</label
          >
          <input
            id="search-problem"
            v-model="searchProblem"
            type="text"
            placeholder="输入题目标题"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @keyup.enter="searchSubmissions"
          />
        </div>
        <div>
          <label for="search-competition" class="block text-sm font-medium text-gray-700 mb-1"
            >比赛标题</label
          >
          <input
            id="search-competition"
            v-model="searchCompetition"
            type="text"
            placeholder="输入比赛标题"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @keyup.enter="searchSubmissions"
          />
        </div>
      </div>
      <div class="mt-4 flex justify-end space-x-3">
        <button
          @click="clearSearch"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          清空
        </button>
        <button
          @click="searchSubmissions"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          搜索
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                用户
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
                题目
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                状态
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                得分
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
            <!-- 首屏加载使用骨架屏；之后刷新不再闪动 -->
            <tr v-if="submissionsPending && !hasLoadedOnce" v-for="n in itemsPerPage" :key="`skeleton-${n}`">
              <td class="px-6 py-4" colspan="9">
                <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
              </td>
            </tr>
            <!-- 常规展示：即使刷新也保持表格，不显示骨架屏，以避免抖动 -->
            <template v-for="submission in submissions" :key="submission.id">
              <tr
                class="hover:bg-gray-50 cursor-pointer"
                @click="toggleExpand(submission.id)"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ submission.id }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ submission.user.username }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ submission.team.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ submission.competition.title }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ submission.problem.title }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    :class="statusClass(submission.status)"
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                  >
                    {{ getStatusText(submission.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ submission.score !== null ? submission.score : '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ new Date(submission.createdAt).toLocaleString() }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" @click.stop>
                  <div class="flex space-x-2">
                    <button
                      @click="downloadSubmission(submission.id)"
                      class="text-blue-600 hover:text-blue-900"
                    >
                      下载
                    </button>
                    <button
                      @click="requeueSubmission(submission.id)"
                      class="text-yellow-600 hover:text-yellow-900"
                    >
                      重新入队
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="expandedRows.includes(submission.id)">
                <td colspan="9" class="px-6 py-4 bg-gray-50">
                  <div class="space-y-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900 mb-2">详细信息</h4>
                      <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span class="text-gray-600">评测时间:</span>
                          <span class="ml-2 font-medium">
                            {{ submission.judgedAt ? new Date(submission.judgedAt).toLocaleString() : '未评测' }}
                          </span>
                        </div>
                        <div>
                          <span class="text-gray-600">提交URL:</span>
                          <a
                            :href="submission.submissionUrl"
                            target="_blank"
                            class="ml-2 text-blue-600 hover:text-blue-800 font-medium truncate block"
                          >
                            {{ submission.submissionUrl }}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div v-if="submission.executionLogs">
                      <h4 class="text-sm font-medium text-gray-900 mb-2">执行日志</h4>
                      <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-60 overflow-y-auto">
                        <pre>{{ submission.executionLogs }}</pre>
                      </div>
                    </div>

                    <div v-if="submission.stdout">
                      <h4 class="text-sm font-medium text-gray-900 mb-2">标准输出</h4>
                      <div class="bg-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{{ submission.stdout }}</pre>
                      </div>
                    </div>

                    <div v-if="submission.stderr">
                      <h4 class="text-sm font-medium text-gray-900 mb-2">标准错误</h4>
                      <div class="bg-red-50 text-red-800 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre>{{ submission.stderr }}</pre>
                      </div>
                    </div>
                  </div>
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

// 分页状态
const currentPage = ref(1);
const itemsPerPage = ref(10);

// 搜索状态
const searchId = ref("");
const searchUser = ref("");
const searchTeam = ref("");
const searchProblem = ref("");
const searchCompetition = ref("");

// 展开行状态
const expandedRows = ref<string[]>([]);

// 构建查询参数
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: itemsPerPage.value,
  id: searchId.value,
  user: searchUser.value,
  team: searchTeam.value,
  problem: searchProblem.value,
  competition: searchCompetition.value,
}));

// 数据获取
const { data, pending, refresh } = useFetch("/api/admin/submissions", {
  query: queryParams,
});

const submissionsPending = pending;
const refreshSubmissions = refresh;

// 首屏加载标记：仅在首次加载完毕后置为 true
const hasLoadedOnce = ref(false);
watch(
  [submissionsPending, data],
  ([p, d]) => {
    if (!p && d?.submissions) hasLoadedOnce.value = true;
  },
  { immediate: true }
);

// 稳定数据层：当返回数据与现有展示一致时，不替换，避免无意义的 DOM 变动
type SubmissionLite = { id: string; status: string; score: number | null; createdAt: string; judgedAt: string | null };
const stableSubmissions = ref<any[]>([]);
let lastSignature = "";

function buildSignature(list: any[]): string {
  try {
    return list
      .map((s: any) => [s.id, s.status, s.score ?? "", s.judgedAt ?? "", s.createdAt ?? ""].join("|"))
      .join(";");
  } catch (e) {
    return Math.random().toString();
  }
}

watch(
  () => data.value?.submissions,
  (newList) => {
    if (!Array.isArray(newList)) return;
    const sig = buildSignature(newList);
    if (sig === lastSignature) return; // 数据未变化，不更新视图
    lastSignature = sig;
    stableSubmissions.value = newList;
  },
  { immediate: true }
);

// 自动刷新：每3秒刷新一次，使用当前查询参数
onMounted(() => {
  const interval = setInterval(async () => {
    try {
      await refreshSubmissions();
    } catch (e) {
      // 静默失败，避免打断当前视图
    }
  }, 3000);
  onUnmounted(() => clearInterval(interval));
});

// 切换展开/折叠状态
function toggleExpand(submissionId: string) {
  const index = expandedRows.value.indexOf(submissionId);
  if (index > -1) {
    expandedRows.value.splice(index, 1);
  } else {
    expandedRows.value.push(submissionId);
  }
}

function statusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "JUDGING":
      return "bg-blue-100 text-blue-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "ERROR":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusText(status: string) {
  const statusMap = {
    PENDING: "等待评测",
    JUDGING: "评测中",
    COMPLETED: "已完成",
    ERROR: "评测失败",
  };
  return statusMap[status] || status;
}

function downloadSubmission(submissionId: string) {
  window.open(`/api/admin/submissions/${submissionId}/download`, "_blank");
}

async function requeueSubmission(submissionId: string) {
  try {
    await $fetch(`/api/admin/submissions/${submissionId}/requeue`, {
      method: "POST",
    });
    push.success("提交已成功重新入队！");
    // Refresh the list
    await refreshSubmissions();
  } catch (error) {
    console.error("Failed to re-queue submission:", error);
    push.error("重新入队提交失败。");
  }
}

// 搜索功能
const searchSubmissions = () => {
  currentPage.value = 1;
  refreshSubmissions();
};

// 清空搜索
const clearSearch = () => {
  searchId.value = "";
  searchUser.value = "";
  searchTeam.value = "";
  searchProblem.value = "";
  searchCompetition.value = "";
  currentPage.value = 1;
  refreshSubmissions();
};

// 分页相关方法
const goToPage = (page: number) => {
  currentPage.value = page;
  refreshSubmissions();
};

const changeItemsPerPage = (newItemsPerPage: number) => {
  itemsPerPage.value = newItemsPerPage;
  currentPage.value = 1;
  refreshSubmissions();
};

// 计算属性，用于获取提交数据
const submissions = computed(() => stableSubmissions.value);
</script>
