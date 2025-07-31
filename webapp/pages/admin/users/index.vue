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
        <li class="text-gray-900">用户管理</li>
      </ol>
    </nav>

    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">用户管理</h1>
      <p class="mt-2 text-gray-600">管理系统中的所有用户</p>
    </div>

    <!-- 搜索和筛选 -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-4">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1"
            >搜索用户</label
          >
          <input
            id="search"
            v-model="searchQuery"
            type="text"
            placeholder="按用户名或邮箱搜索"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            @keyup.enter="searchUsers"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="searchUsers"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            搜索
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
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 用户列表 -->
    <div v-else-if="data?.users" class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                用户ID
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                用户名
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                真实姓名
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                邮箱
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                手机号
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                学号
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                学历
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                角色
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                用户状态
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                邮箱验证
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                注册时间
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
            <tr v-for="user in data.users" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ user.id }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ user.username }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.realName || "-" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.email }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.phoneNumber || "-" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.studentId || "-" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ getEducationLabel(user.education) || "-" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span
                  :class="{
                    'bg-blue-100 text-blue-800': user.role === 'admin',
                    'bg-green-100 text-green-800': user.role === 'user',
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ user.role === "admin" ? "管理员" : "普通用户" }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span
                  :class="getStatusClass(user.status)"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ getStatusLabel(user.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span
                  :class="{
                    'bg-green-100 text-green-800': user.emailVerifiedAt,
                    'bg-red-100 text-red-800': !user.emailVerifiedAt,
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ user.emailVerifiedAt ? "已验证" : "未验证" }}
                </span>
                <div v-if="user.emailVerifiedAt" class="text-xs text-gray-400 mt-1">
                  {{ formatDate(user.emailVerifiedAt) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="openEditModal(user)"
                  class="text-indigo-600 hover:text-indigo-900"
                >
                  编辑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 空状态 -->
      <div v-if="data.users.length === 0" class="text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">👥</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无用户</h3>
        <p class="text-gray-600">没有找到符合条件的用户。</p>
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

  <!-- 用户编辑模态框 -->
  <div v-if="showEditModal" class="fixed inset-0 overflow-y-auto z-50">
    <div
      class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
    >
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div
          @click="closeEditModal"
          class="absolute inset-0 bg-gray-500 opacity-75"
        ></div>
      </div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true"
        >&#8203;</span
      >

      <div
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
      >
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                编辑用户信息
              </h3>
              <div class="mt-2">
                <form @submit.prevent="saveUser">
                  <div class="mb-4">
                    <label
                      for="user-username"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      用户名 *
                    </label>
                    <input
                      id="user-username"
                      v-model="userForm.username"
                      type="text"
                      readonly
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-realName"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      真实姓名
                    </label>
                    <input
                      id="user-realName"
                      v-model="userForm.realName"
                      type="text"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入真实姓名"
                    />
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-email"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      邮箱 *
                    </label>
                    <input
                      id="user-email"
                      v-model="userForm.email"
                      type="email"
                      required
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入邮箱地址"
                    />
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-phoneNumber"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      手机号
                    </label>
                    <input
                      id="user-phoneNumber"
                      v-model="userForm.phoneNumber"
                      type="text"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入手机号"
                    />
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-studentId"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      学号
                    </label>
                    <input
                      id="user-studentId"
                      v-model="userForm.studentId"
                      type="text"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入学号"
                    />
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-education"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      学历
                    </label>
                    <select
                      id="user-education"
                      v-model="userForm.education"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">请选择学历</option>
                      <option value="BACHELOR">学士</option>
                      <option value="MASTER">硕士</option>
                      <option value="DOCTORATE">博士</option>
                    </select>
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-role"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      角色 *
                    </label>
                    <select
                      id="user-role"
                      v-model="userForm.role"
                      required
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="USER">普通用户</option>
                      <option value="ADMIN">管理员</option>
                    </select>
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-status"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      用户状态 *
                    </label>
                    <select
                      id="user-status"
                      v-model="userForm.status"
                      required
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="PENDING">待确认</option>
                      <option value="ACTIVE">正常</option>
                      <option value="BANNED">封禁</option>
                    </select>
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-emailVerifiedAt"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      邮箱验证时间
                    </label>
                    <div class="flex gap-2">
                      <input
                        id="user-emailVerifiedAt"
                        v-model="userForm.emailVerifiedAt"
                        type="datetime-local"
                        class="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        @click="setCurrentTime"
                        class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
                      >
                        设为当前时间
                      </button>
                      <button
                        type="button"
                        @click="clearEmailVerification"
                        class="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md"
                      >
                        清除验证
                      </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                      设置邮箱验证时间，留空表示未验证
                    </p>
                  </div>

                  <div class="mb-4">
                    <label
                      for="user-password"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      密码
                    </label>
                    <input
                      id="user-password"
                      v-model="userForm.password"
                      type="password"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="留空则不修改密码"
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            @click="saveUser"
            type="button"
            :disabled="isSubmitting"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
          >
            {{ isSubmitting ? "保存中..." : "保存" }}
          </button>
          <button
            @click="closeEditModal"
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            取消
          </button>
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

// 用户编辑模态框相关
const showEditModal = ref(false);
const isSubmitting = ref(false);
const userForm = ref({
  id: "",
  username: "",
  realName: "",
  email: "",
  phoneNumber: "",
  studentId: "",
  education: "",
  role: "USER",
  status: "ACTIVE",
  emailVerifiedAt: "",
  password: "",
});

// 构建查询参数
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: itemsPerPage.value,
  search: searchQuery.value,
}));

const { data, pending, error, refresh } = await useFetch("/api/admin/users", {
  query: queryParams,
});

const searchUsers = () => {
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

// 获取学历标签
const getEducationLabel = (education) => {
  switch (education) {
    case "BACHELOR":
      return "本科";
    case "MASTER":
      return "硕士";
    case "DOCTORATE":
      return "博士";
    default:
      return "";
  }
};

// 获取用户状态标签
const getStatusLabel = (status) => {
  switch (status) {
    case "PENDING":
      return "待确认";
    case "ACTIVE":
      return "正常";
    case "BANNED":
      return "封禁";
    default:
      return "未知";
  }
};

// 获取用户状态样式类
const getStatusClass = (status) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "BANNED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// 设置当前时间为邮箱验证时间
const setCurrentTime = () => {
  const now = new Date();
  // 转换为本地时间格式 (YYYY-MM-DDTHH:MM)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  userForm.value.emailVerifiedAt = `${year}-${month}-${day}T${hours}:${minutes}`;
};

// 清除邮箱验证时间
const clearEmailVerification = () => {
  userForm.value.emailVerifiedAt = "";
};

// 格式化ISO时间字符串为本地时间输入格式
const formatDateTimeForInput = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// 打开编辑模态框
const openEditModal = (user) => {
  userForm.value = {
    id: user.id,
    username: user.username,
    realName: user.realName || "",
    email: user.email,
    phoneNumber: user.phoneNumber || "",
    studentId: user.studentId || "",
    education: user.education || "",
    role: user.role.toUpperCase(),
    status: user.status || "ACTIVE",
    emailVerifiedAt: formatDateTimeForInput(user.emailVerifiedAt),
    password: "",
  };
  showEditModal.value = true;
};

// 关闭编辑模态框
const closeEditModal = () => {
  showEditModal.value = false;
};

// 表单验证
const validateForm = () => {
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userForm.value.email)) {
    push.error("请输入有效的邮箱地址");
    return false;
  }

  // 验证手机号格式（如果填写了）
  if (userForm.value.phoneNumber) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(userForm.value.phoneNumber)) {
      push.error("请输入有效的手机号码");
      return false;
    }
  }

  return true;
};

// 保存用户信息
const saveUser = async () => {
  if (isSubmitting.value) return;

  // 表单验证
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    // 准备提交的数据
    const userData = {
      realName: userForm.value.realName || undefined,
      email: userForm.value.email,
      phoneNumber: userForm.value.phoneNumber || undefined,
      studentId: userForm.value.studentId || undefined,
      education: userForm.value.education || undefined,
      role: userForm.value.role,
      status: userForm.value.status,
      emailVerifiedAt: userForm.value.emailVerifiedAt
        ? new Date(userForm.value.emailVerifiedAt).toISOString()
        : null,
    };

    // 如果填写了密码，则添加到提交数据中
    if (userForm.value.password) {
      userData.password = userForm.value.password;
    }

    // 调用API更新用户信息
    const response = await $fetch(`/api/admin/users/${userForm.value.id}`, {
      method: "PUT",
      body: userData,
    });

    if (response.success) {
      closeEditModal();
      await refresh();
      push.success("用户信息更新成功");
    } else {
      push.error("更新用户信息失败");
    }
  } catch (err) {
    console.error("保存用户信息时出错:", err);
    push.error("保存用户信息时出错: " + (err.data?.message || err.message || "未知错误"));
  } finally {
    isSubmitting.value = false;
  }
};
</script>
