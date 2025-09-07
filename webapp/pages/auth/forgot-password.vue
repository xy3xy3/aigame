<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">找回密码</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          请输入您的邮箱地址，我们将向您发送密码重置链接
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleForgotPassword">
        <div class="rounded-md shadow-sm space-y-4">
          <div>
            <label for="email" class="sr-only">邮箱地址</label>
            <input
              id="email"
              v-model="form.email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="请输入邮箱地址"
            />
          </div>
        </div>

        <div v-if="error" class="text-red-600 text-sm text-center">
          {{ error }}
        </div>

        <div v-if="success" class="text-green-600 text-sm text-center">
          {{ success }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {{ isLoading ? "发送中..." : "发送重置邮件" }}
          </button>
        </div>

        <div class="text-center">
          <NuxtLink to="/login" class="text-blue-600 hover:text-blue-500 text-sm">
            返回登录
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const form = reactive({
  email: "",
});

const isLoading = ref(false);
const error = ref("");
const success = ref("");

const handleForgotPassword = async () => {
  if (isLoading.value) return;

  error.value = "";
  success.value = "";

  // 简单的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) {
    error.value = "请输入有效的邮箱地址";
    return;
  }

  isLoading.value = true;

  try {
    const response = await $fetch("/api/auth/forgot-password", {
      method: "POST",
      body: {
        email: form.email,
      },
    });

    success.value = response.message || "密码重置邮件已发送到您的邮箱，请查收";
    form.email = ""; // 清空表单
  } catch (err) {
    console.error("Forgot password error:", err);

    // 处理不同类型的错误
    if (err.status === 404) {
      error.value = "该邮箱地址未注册，请检查邮箱地址或先注册账户";
    } else if (err.status === 403) {
      error.value = "账户状态异常，无法重置密码。请联系管理员";
    } else if (err.status === 400) {
      error.value = "请输入有效的邮箱地址";
    } else if (err.status === 500) {
      error.value = "服务器内部错误，请稍后再试";
    } else {
      error.value = err.statusMessage || err.message || "发送重置邮件失败，请稍后再试";
    }
  } finally {
    isLoading.value = false;
  }
};

// 页面元数据
useHead({
  title: "找回密码",
});
</script>
