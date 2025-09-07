<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">重置密码</h2>
        <p class="mt-2 text-center text-sm text-gray-600">请输入您的新密码</p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleResetPassword">
        <div class="rounded-md shadow-sm space-y-4">
          <div>
            <label for="password" class="sr-only">新密码</label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="请输入新密码"
            />
          </div>
          <div>
            <label for="confirmPassword" class="sr-only">确认新密码</label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="请再次输入新密码"
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
            {{ isLoading ? "重置中..." : "重置密码" }}
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
const route = useRoute();
const router = useRouter();

// 从URL查询参数中获取邮箱和令牌
const email = route.query.email;
const token = route.query.token;

const form = reactive({
  password: "",
  confirmPassword: "",
});

const isLoading = ref(false);
const error = ref("");
const success = ref("");

// 检查必要的查询参数
onMounted(() => {
  if (!email || !token) {
    error.value = "缺少必要的重置参数，请重新申请密码重置";
    return;
  }
});

const validateForm = () => {
  // 密码长度验证
  if (form.password.length < 6) {
    error.value = "密码长度至少需要6位";
    return false;
  }

  // 两次密码输入一致性验证
  if (form.password !== form.confirmPassword) {
    error.value = "两次输入的密码不一致";
    return false;
  }

  return true;
};

const handleResetPassword = async () => {
  if (isLoading.value) return;

  error.value = "";
  success.value = "";

  // 检查必要的查询参数
  if (!email || !token) {
    error.value = "缺少必要的重置参数，请重新申请密码重置";
    return;
  }

  // 表单验证
  if (!validateForm()) {
    return;
  }

  isLoading.value = true;

  try {
    const response = await $fetch("/api/auth/reset-password", {
      method: "POST",
      body: {
        email: email,
        token: token,
        newPassword: form.password,
      },
    });

    success.value = "密码重置成功！正在跳转到登录页面...";

    // 清空表单
    form.password = "";
    form.confirmPassword = "";

    // 2秒后跳转到登录页面
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  } catch (err) {
    console.error("Reset password error:", err);

    // 处理不同类型的错误，提供更清晰的错误信息
    if (err.status === 400) {
      // 根据具体错误消息提供更准确的提示
      if (err.statusMessage?.includes("令牌不存在")) {
        error.value = "密码重置令牌不存在，请重新申请密码重置";
      } else if (err.statusMessage?.includes("令牌无效")) {
        error.value = "密码重置令牌无效，请重新申请密码重置";
      } else if (err.statusMessage?.includes("令牌已过期")) {
        error.value = "密码重置令牌已过期，请重新申请密码重置";
      } else if (err.statusMessage?.includes("参数验证失败")) {
        error.value = "输入参数不符合要求，请检查密码格式";
      } else {
        error.value = err.statusMessage || "重置令牌验证失败，请重新申请密码重置";
      }
    } else if (err.status === 403) {
      error.value = "账户状态异常，无法重置密码。请联系管理员";
    } else if (err.status === 404) {
      error.value = "该邮箱地址未注册，请检查邮箱地址是否正确";
    } else if (err.status === 500) {
      error.value = "服务器内部错误，请稍后再试或联系技术支持";
    } else {
      error.value = err.statusMessage || err.message || "密码重置失败，请稍后再试";
    }
  } finally {
    isLoading.value = false;
  }
};

// 页面元数据
useHead({
  title: "重置密码",
});
</script>
