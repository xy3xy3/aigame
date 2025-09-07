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
        <li class="text-gray-900">队伍管理</li>
      </ol>
    </nav>

    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">队伍管理</h1>
      <p class="mt-2 text-gray-600">管理系统中的所有队伍</p>
    </div>

    <!-- 搜索和筛选 -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-4">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1"
            >搜索队伍</label
          >
          <input
            id="search"
            v-model="searchQuery"
            type="text"
            placeholder="按队伍名搜索"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @keyup.enter="searchTeams"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="searchTeams"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            搜索
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
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 队伍列表 -->
    <div v-else-if="data?.teams" class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                队伍ID
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                队伍名称
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                队长
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                成员数量
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                锁定状态
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                创建时间
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
            <tr v-for="team in data.teams" :key="team.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ team.id }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ team.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ team.creator?.username }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ team.memberCount }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span
                  :class="
                    team.isLocked
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  "
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ team.isLocked ? "已锁定" : "未锁定" }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(team.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button
                  @click="openModal(team)"
                  class="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm font-medium"
                >
                  编辑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 空状态 -->
      <div v-if="data.teams.length === 0" class="text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">👥</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无队伍</h3>
        <p class="text-gray-600">没有找到符合条件的队伍。</p>
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

    <!-- 队伍编辑模态框 -->
    <div v-if="showModal" class="fixed inset-0 overflow-y-auto z-50">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
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
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">编辑队伍</h3>
                <div class="mt-2">
                  <form @submit.prevent="saveTeam">
                    <div class="mb-4">
                      <label
                        for="team-name"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        队伍名称 *
                      </label>
                      <input
                        id="team-name"
                        v-model="teamForm.name"
                        type="text"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="输入队伍名称"
                      />
                    </div>

                    <div class="mb-4">
                      <label
                        for="team-description"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        队伍描述
                      </label>
                      <textarea
                        id="team-description"
                        v-model="teamForm.description"
                        rows="3"
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="输入队伍描述"
                      ></textarea>
                    </div>

                    <div class="mb-4">
                      <label
                        for="team-avatar"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        头像URL
                      </label>
                      <input
                        id="team-avatar"
                        v-model="teamForm.avatarUrl"
                        type="text"
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="输入头像URL"
                      />
                    </div>

                    <div class="mb-4">
                      <div class="flex items-center">
                        <input
                          id="team-locked"
                          v-model="teamForm.isLocked"
                          type="checkbox"
                          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label for="team-locked" class="ml-2 block text-sm text-gray-900">
                          锁定队伍
                        </label>
                      </div>
                      <p class="mt-1 text-sm text-gray-500">
                        锁定后，队伍将无法参加新的竞赛
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="saveTeam"
              type="button"
              :disabled="isSubmitting"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {{ isSubmitting ? "保存中..." : "保存" }}
            </button>
            <button
              @click="closeModal"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(10);

// 构建查询参数
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: itemsPerPage.value,
  search: searchQuery.value,
}));

const { data, pending, error, refresh } = await useFetch("/api/admin/teams", {
  query: queryParams,
});

// 模态框相关状态
const showModal = ref(false);
const isSubmitting = ref(false);
const teamForm = ref({
  id: "",
  name: "",
  description: "",
  avatarUrl: "",
  isLocked: false,
});

const searchTeams = () => {
  currentPage.value = 1;
  refresh();
};

const goToPage = (page) => {
  currentPage.value = page;
  refresh();
};

const changeItemsPerPage = (newItemsPerPage) => {
  itemsPerPage.value = newItemsPerPage;
  currentPage.value = 1;
  refresh();
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// 打开模态框
const openModal = (team) => {
  if (team) {
    // 编辑模式
    teamForm.value = {
      id: team.id,
      name: team.name,
      description: team.description || "",
      avatarUrl: team.avatarUrl || "",
      isLocked: team.isLocked || false,
    };
  } else {
    // 新增模式（虽然当前需求没有提到新增，但保留此功能）
    teamForm.value = {
      id: "",
      name: "",
      description: "",
      avatarUrl: "",
      isLocked: false,
    };
  }
  showModal.value = true;
};

// 关闭模态框
const closeModal = () => {
  showModal.value = false;
};

// 保存队伍信息
const saveTeam = async () => {
  if (isSubmitting.value) return;

  // 表单验证
  if (!teamForm.value.name.trim()) {
    push.error("队伍名称不能为空");
    return;
  }

  isSubmitting.value = true;

  try {
    // 调用API更新队伍信息
    const response = await $fetch(`/api/admin/teams/${teamForm.value.id}`, {
      method: "PUT",
      body: {
        name: teamForm.value.name,
        description: teamForm.value.description,
        avatarUrl: teamForm.value.avatarUrl,
        isLocked: teamForm.value.isLocked,
      },
    });

    if (response.success) {
      // 关闭模态框
      closeModal();

      // 刷新列表
      await refresh();

      // 显示成功消息
      push.success("队伍信息更新成功");
    } else {
      push.error("更新队伍信息失败");
    }
  } catch (err) {
    console.error("保存队伍信息时出错:", err);
    push.error("保存队伍信息时出错: " + (err.data?.message || err.message || "未知错误"));
  } finally {
    isSubmitting.value = false;
  }
};
</script>
