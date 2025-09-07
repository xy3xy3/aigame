<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">邮箱验证</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ email ? `正在验证 ${email}` : "正在验证您的邮箱地址" }}
        </p>
      </div>

      <!-- 验证中状态 -->
      <div v-if="verificationStatus === 'verifying'" class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-gray-600">正在验证您的邮箱，请稍候...</p>
      </div>

      <!-- 验证成功状态 -->
      <div v-else-if="verificationStatus === 'success'" class="text-center">
        <div
          class="rounded-full bg-green-100 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">验证成功！</h3>
        <p class="text-gray-600 mb-6">您的邮箱已成功验证，账户已激活。</p>
        <p class="text-sm text-gray-500 mb-4">
          {{
            redirectCountdown > 0
              ? `${redirectCountdown}秒后自动跳转到登录页面`
              : "正在跳转..."
          }}
        </p>
        <button
          @click="navigateToLogin"
          class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          立即前往登录
        </button>
      </div>

      <!-- 验证失败状态 -->
      <div v-else-if="verificationStatus === 'error'" class="text-center">
        <div
          class="rounded-full bg-red-100 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">验证失败</h3>
        <p class="text-red-600 mb-6">{{ errorMessage }}</p>

        <!-- 令牌过期时显示重发选项 -->
        <div v-if="isTokenExpired" class="space-y-4">
          <p class="text-sm text-gray-600">验证链接已过期，您可以重新发送验证邮件。</p>
          <button
            @click="resendVerificationEmail"
            :disabled="resendStatus === 'resending'"
            class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {{ resendStatus === "resending" ? "发送中..." : "重发验证邮件" }}
          </button>

          <div v-if="resendStatus === 'resent'" class="text-green-600 text-sm">
            验证邮件已重新发送，请查收邮件进行验证。
          </div>
          <div v-if="resendError" class="text-red-600 text-sm">
            {{ resendError }}
          </div>
        </div>

        <!-- 其他错误时显示返回登录选项 -->
        <div v-else class="space-y-4">
          <button
            @click="navigateToLogin"
            class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            返回登录页面
          </button>
        </div>
      </div>

      <!-- 待验证状态（缺少参数） -->
      <div v-else-if="verificationStatus === 'pending'" class="text-center">
        <div
          class="rounded-full bg-yellow-100 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            ></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">无效的验证链接</h3>
        <p class="text-gray-600 mb-6">
          验证链接缺少必要参数，请检查您的邮件中的完整链接。
        </p>
        <button
          @click="navigateToLogin"
          class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          返回登录页面
        </button>
      </div>

      <!-- 返回登录链接 -->
      <div v-if="verificationStatus !== 'success'" class="text-center">
        <NuxtLink to="/login" class="text-blue-600 hover:text-blue-500 text-sm">
          返回登录页面
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
// 设置页面元数据
definePageMeta({
  layout: false,
  auth: false,
});

// 状态定义
const route = useRoute();
const router = useRouter();

// URL参数
const token = computed(() => route.query.token);
const email = computed(() => route.query.email);

// 验证状态
const verificationStatus = ref("pending");
const errorMessage = ref("");
const isTokenExpired = ref(false);

// 重发邮件状态
const resendStatus = ref("idle");
const resendError = ref("");

// 成功后倒计时
const redirectCountdown = ref(5);
const redirectTimer = ref(null);

// 页面加载时检查参数并开始验证
onMounted(async () => {
  // 检查必要参数
  if (!token.value || !email.value) {
    verificationStatus.value = "pending";
    return;
  }

  // 开始验证
  await verifyEmail();
});

// 清理定时器
onUnmounted(() => {
  if (redirectTimer.value) {
    clearInterval(redirectTimer.value);
  }
});

// 验证邮箱
const verifyEmail = async () => {
  if (!token.value || !email.value) {
    verificationStatus.value = "pending";
    return;
  }

  verificationStatus.value = "verifying";
  errorMessage.value = "";
  isTokenExpired.value = false;

  try {
    const response = await $fetch("/api/auth/verify-email", {
      method: "POST",
      body: {
        email: email.value,
        token: token.value,
      },
    });

    if (response.success) {
      verificationStatus.value = "success";
      startRedirectCountdown();
    }
  } catch (error) {
    verificationStatus.value = "error";

    // 处理不同的错误状态
    const statusCode = error.statusCode || error.status || 500;
    const message = error.statusMessage || error.message || "验证失败";

    switch (statusCode) {
      case 400:
        if (message.includes("过期")) {
          isTokenExpired.value = true;
          errorMessage.value = "验证链接已过期";
        } else if (message.includes("已验证")) {
          errorMessage.value = "邮箱已验证，无需重复验证";
        } else if (message.includes("无效")) {
          errorMessage.value = "验证链接无效";
        } else {
          errorMessage.value = message;
        }
        break;
      case 403:
        errorMessage.value = "账户已被封禁，无法验证";
        break;
      case 404:
        errorMessage.value = "用户不存在";
        break;
      case 500:
        errorMessage.value = "服务器错误，请稍后重试";
        break;
      default:
        errorMessage.value = message;
    }
  }
};

// 重发验证邮件
const resendVerificationEmail = async () => {
  if (!email.value || resendStatus.value === "resending") {
    return;
  }

  resendStatus.value = "resending";
  resendError.value = "";

  try {
    const response = await $fetch("/api/auth/resend-verification", {
      method: "POST",
      body: {
        email: email.value,
      },
    });

    if (response.success) {
      resendStatus.value = "resent";
    }
  } catch (error) {
    resendStatus.value = "idle";
    const message = error.statusMessage || error.message || "发送失败，请稍后重试";
    resendError.value = message;
  }
};

// 开始倒计时并自动跳转
const startRedirectCountdown = () => {
  redirectTimer.value = setInterval(() => {
    redirectCountdown.value--;
    if (redirectCountdown.value <= 0) {
      navigateToLogin();
    }
  }, 1000);
};

// 跳转到登录页面
const navigateToLogin = () => {
  if (redirectTimer.value) {
    clearInterval(redirectTimer.value);
  }
  router.push("/login");
};
</script>
