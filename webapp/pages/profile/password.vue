<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 面包屑导航 -->
    <nav class="mb-4 text-sm">
      <ol class="flex items-center space-x-2 text-gray-500">
        <li>
          <NuxtLink to="/" class="hover:text-indigo-600">首页</NuxtLink>
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
          <NuxtLink to="/profile" class="hover:text-indigo-600">个人资料</NuxtLink>
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
        <li class="text-gray-900">修改密码</li>
      </ol>
    </nav>

    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">修改密码</h1>
    </div>

    <div class="bg-white shadow rounded-lg p-6">
      <form @submit.prevent="submitForm" class="space-y-6">
        <div>
          <label
            for="current-password"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            旧密码
          </label>
          <input
            id="current-password"
            v-model="oldPassword"
            type="password"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">
            新密码
          </label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label
            for="confirm-password"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            确认新密码
          </label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div v-if="message" class="text-green-600 text-sm">
          {{ message }}
        </div>
        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="isUpdating"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {{ isUpdating ? "更新中..." : "更新密码" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "auth",
});

const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const message = ref("");
const error = ref("");
const isUpdating = ref(false);

const submitForm = async () => {
  message.value = "";
  error.value = "";

  if (newPassword.value !== confirmPassword.value) {
    error.value = "新密码和确认密码不匹配。";
    return;
  }
  if (!newPassword.value || newPassword.value.length < 8) {
    error.value = "新密码长度不能少于8位。";
    return;
  }

  isUpdating.value = true;

  try {
    await $fetch("/api/users/profile/password", {
      method: "PUT",
      body: {
        oldPassword: oldPassword.value,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
      },
    });
    message.value = "密码修改成功。";
    oldPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";

    // 延迟清除成功消息
    setTimeout(() => {
      message.value = "";
    }, 3000);
  } catch (e) {
    error.value = e.data?.message || "修改密码失败。";
  } finally {
    isUpdating.value = false;
  }
};
</script>
