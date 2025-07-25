<template>
  <div class="p-4 sm:p-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
      提交管理
    </h1>
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" class="px-6 py-3">
              ID
            </th>
            <th scope="col" class="px-6 py-3">
              用户
            </th>
            <th scope="col" class="px-6 py-3">
              队伍
            </th>
            <th scope="col" class="px-6 py-3">
              题目
            </th>
            <th scope="col" class="px-6 py-3">
              状态
            </th>
            <th scope="col" class="px-6 py-3">
              提交时间
            </th>
            <th scope="col" class="px-6 py-3">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending" v-for="n in 5" :key="n" class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            <td class="px-6 py-4">
              <div class="h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            </td>
            <td class="px-6 py-4">
              <div class="h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            </td>
            <td class="px-6 py-4">
              <div class="h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            </td>
            <td class="px-6 py-4">
              <div class="h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            </td>
            <td class="px-6 py-4">
              <div class="h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            </td>
            <td class="px-6 py-4">
              <div class="h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            </td>
            <td class="px-6 py-4">
              <div class="flex space-x-2">
                <div class="h-8 w-20 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
                <div class="h-8 w-20 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
              </div>
            </td>
          </tr>
          <tr v-else v-for="submission in submissions" :key="submission.id" class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
              {{ submission.id }}
            </th>
            <td class="px-6 py-4">
              {{ submission.user.username }}
            </td>
            <td class="px-6 py-4">
              {{ submission.team.name }}
            </td>
            <td class="px-6 py-4">
              {{ submission.problem.title }}
            </td>
            <td class="px-6 py-4">
              <span :class="statusClass(submission.status)">
                {{ submission.status }}
              </span>
            </td>
            <td class="px-6 py-4">
              {{ new Date(submission.createdAt).toLocaleString() }}
            </td>
            <td class="px-6 py-4">
              <div class="flex space-x-2">
                <button
                  @click="downloadSubmission(submission.id)"
                  class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800"
                >
                  下载
                </button>
                <button
                  @click="requeueSubmission(submission.id)"
                  class="px-3 py-1 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 focus:ring-4 focus:outline-none focus:ring-yellow-300 dark:bg-yellow-400 dark:hover:bg-yellow-500 dark:focus:ring-yellow-900"
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
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
});

const { data: submissions, pending, refresh } = useFetch('/api/admin/submissions');

function statusClass(status: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300';
    case 'SUCCESS':
      return 'bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300';
    case 'FAILED':
      return 'bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300';
  }
}

function downloadSubmission(submissionId: string) {
  window.open(`/api/admin/submissions/${submissionId}/download`, '_blank');
}

async function requeueSubmission(submissionId: string) {
  try {
    await $fetch(`/api/admin/submissions/${submissionId}/requeue`, {
      method: 'POST',
    });
    alert('提交已成功重新入队！');
    // Refresh the list
    await refresh();
  } catch (error) {
    console.error('Failed to re-queue submission:', error);
    alert('重新入队提交失败。');
  }
}
</script>