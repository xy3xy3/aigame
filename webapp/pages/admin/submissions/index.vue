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
            <tr v-if="submissionsPending" v-for="n in 5" :key="n">
              <td class="px-6 py-4" colspan="7">
                <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
              </td>
            </tr>
            <tr
              v-else
              v-for="submission in submissions"
              :key="submission.id"
              class="hover:bg-gray-50"
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
                {{ submission.problem.title }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span
                  :class="statusClass(submission.status)"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ submission.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ new Date(submission.createdAt).toLocaleString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

// 构建查询参数
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: itemsPerPage.value,
}));

// 数据获取
const { data, pending, refresh } = useFetch("/api/admin/submissions", {
  query: queryParams,
});

const submissionsPending = pending;
const refreshSubmissions = refresh;

function statusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
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
const submissions = computed(() => data.value?.submissions || []);
</script>
