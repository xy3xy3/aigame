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
        <li class="text-gray-900">公告管理</li>
      </ol>
    </nav>

    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">公告管理</h1>
      </div>
      <button
        @click="openModal()"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
      >
        新增公告
      </button>
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

    <!-- 公告列表 -->
    <div
      v-else-if="data?.announcements"
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
                标题
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
                创建时间
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                修改时间
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
              v-for="announcement in data.announcements"
              :key="announcement.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ announcement.title }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span
                  :class="{
                    'bg-yellow-100 text-yellow-800': announcement.status === 'HIDDEN',
                    'bg-green-100 text-green-800': announcement.status === 'VISIBLE',
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ announcement.status === "HIDDEN" ? "隐藏" : "可见" }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(announcement.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(announcement.updatedAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="openModal(announcement)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  修改
                </button>
                <button
                  @click="openDeleteModal(announcement)"
                  class="text-red-600 hover:text-red-900"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 空状态 -->
      <div v-if="data.announcements.length === 0" class="text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">📢</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无公告</h3>
        <p class="text-gray-600">还没有发布公告。</p>
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

    <!-- 公告模态框 -->
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
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {{ modalTitle }}
                </h3>
                <div class="mt-2">
                  <form @submit.prevent="saveAnnouncement">
                    <div class="mb-4">
                      <label
                        for="announcement-title"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        标题
                      </label>
                      <input
                        id="announcement-title"
                        v-model="announcementForm.title"
                        type="text"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div class="mb-4">
                      <label
                        for="announcement-content"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        内容
                      </label>
                      <textarea
                        id="announcement-content"
                        v-model="announcementForm.content"
                        rows="5"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      ></textarea>
                    </div>
                    <div class="mb-4">
                      <label
                        for="announcement-status"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        状态
                      </label>
                      <select
                        id="announcement-status"
                        v-model="announcementForm.status"
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="VISIBLE">可见</option>
                        <option value="HIDDEN">隐藏</option>
                      </select>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="saveAnnouncement"
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {{ isEditing ? "更新" : "创建" }}
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

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteModal" class="fixed inset-0 overflow-y-auto z-50">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
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
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
              >
                <svg
                  class="h-6 w-6 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">确认删除</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    您确定要删除公告 "{{ deleteForm.title }}" 吗？此操作无法撤销。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="deleteAnnouncement"
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              删除
            </button>
            <button
              @click="closeDeleteModal"
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

const currentPage = ref(1);
const itemsPerPage = ref(10);

// 构建查询参数
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: itemsPerPage.value,
}));

const { data, pending, error, refresh } = await useFetch("/api/admin/announcements", {
  query: queryParams,
});

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

// 公告表单相关
const showModal = ref(false);
const isEditing = ref(false);
const modalTitle = computed(() => (isEditing.value ? "编辑公告" : "新增公告"));

const announcementForm = ref({
  id: "",
  title: "",
  content: "",
  status: "HIDDEN",
});

const openModal = (announcement = null) => {
  if (announcement) {
    // 编辑模式
    isEditing.value = true;
    announcementForm.value = {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      status: announcement.status,
    };
  } else {
    // 新增模式
    isEditing.value = false;
    announcementForm.value = {
      id: "",
      title: "",
      content: "",
      status: "HIDDEN",
    };
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveAnnouncement = async () => {
  try {
    let response;
    if (isEditing.value) {
      // 编辑公告
      response = await $fetch(`/api/admin/announcements/${announcementForm.value.id}`, {
        method: "PUT",
        body: {
          title: announcementForm.value.title,
          content: announcementForm.value.content,
          status: announcementForm.value.status,
        },
      });
    } else {
      // 创建公告
      response = await $fetch("/api/admin/announcements", {
        method: "POST",
        body: announcementForm.value,
      });
    }

    if (response.success) {
      closeModal();
      await refresh();

      // 显示成功消息
      push.success(isEditing.value ? "公告更新成功" : "公告创建成功");
    } else {
      push.error(isEditing.value ? "更新公告失败" : "创建公告失败");
    }
  } catch (err) {
    console.error("保存公告时出错:", err);
    push.error("保存公告时出错: " + err.message);
  }
};

// 删除公告相关
const showDeleteModal = ref(false);
const deleteForm = ref({
  id: "",
  title: "",
});

const openDeleteModal = (announcement) => {
  deleteForm.value = {
    id: announcement.id,
    title: announcement.title,
  };
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
};

const deleteAnnouncement = async () => {
  try {
    const response = await $fetch(`/api/admin/announcements/${deleteForm.value.id}`, {
      method: "DELETE",
    });

    if (response.success) {
      closeDeleteModal();
      await refresh();

      // 显示成功消息
      push.success("公告删除成功");
    } else {
      push.error("删除公告失败");
    }
  } catch (err) {
    console.error("删除公告时出错:", err);
    push.error("删除公告时出错: " + err.message);
  }
};
</script>
