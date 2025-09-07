<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
      <svg class="w-6 h-6 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M18 8a6 6 0 01-7.743 5.743L10 14l-0.257-0.257A6 6 0 1118 8zM2 8a6 6 0 1010.257 5.743L12 14l-0.257-0.257A6 6 0 012 8zm8 2a2 2 0 100-4 2 2 0 000 4z"
          clip-rule="evenodd"
        />
      </svg>
      CDK 领取
    </h2>

    <!-- 加载状态 -->
    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="rounded-md p-4" :class="getErrorClass">
      <div class="flex items-center">
        <svg
          class="w-5 h-5 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
          :class="getErrorIconClass"
        >
          <path
            v-if="isEmailVerificationError"
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
          <path
            v-else
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <p class="font-medium" :class="getErrorTextClass">{{ getErrorTitle }}</p>
          <p
            v-if="getErrorDescription"
            class="mt-1 text-sm"
            :class="getErrorDescriptionClass"
          >
            {{ getErrorDescription }}
          </p>
          <div v-if="isEmailVerificationError" class="mt-3">
            <NuxtLink
              to="/auth/verify-email"
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              前往验证邮箱
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- CDK功能未启用 -->
    <div
      v-else-if="!cdkData?.cdkEnabled"
      class="bg-gray-50 border border-gray-200 rounded-md p-4"
    >
      <div class="flex items-center">
        <svg class="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="text-gray-600">此比赛未启用CDK功能</p>
      </div>
    </div>

    <!-- CDK功能已启用 -->
    <div v-else class="space-y-6">
      <!-- 状态信息卡片 -->
      <div
        class="bg-primary-bg-light border border-primary-border rounded-lg p-4"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
            <span class="font-medium text-gray-900">
              {{ cdkData.claimMode === "TEAM" ? "团队模式" : "个人模式" }}
            </span>
          </div>
          <div v-if="cdkData.team" class="text-sm text-gray-600">
            团队: {{ cdkData.team.name }}
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">
              {{ cdkData.stats.claimed }}
            </div>
            <div class="text-gray-600">已领取</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">
              {{ cdkData.stats.remaining }}
            </div>
            <div class="text-gray-600">剩余额度</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ cdkData.stats.limit }}</div>
            <div class="text-gray-600">总限制</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-primary">
              {{ cdkData.stats.available }}
            </div>
            <div class="text-gray-600">可用库存</div>
          </div>
        </div>
      </div>

      <!-- 领取按钮 -->
      <div class="flex justify-center">
        <button
          @click="claimCdk"
          :disabled="!canClaim || isClaiming"
          :class="[
            'px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105',
            canClaim && !isClaiming
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
              : 'bg-gray-400 text-white cursor-not-allowed',
          ]"
        >
          <div v-if="isClaiming" class="flex items-center">
            <div
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
            ></div>
            领取中...
          </div>
          <div v-else>
            {{ getClaimButtonText }}
          </div>
        </button>
      </div>

      <!-- 状态提示 -->
      <div v-if="!canClaim" class="text-center">
        <div
          class="inline-flex items-center px-3 py-2 rounded-full text-sm bg-yellow-100 text-yellow-800"
        >
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          {{ getStatusMessage }}
        </div>
      </div>

      <!-- 已领取的CDK列表 -->
      <div v-if="cdkData.cdks.length > 0">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">
          {{ cdkData.claimMode === "TEAM" ? "团队已领取的CDK" : "我的CDK" }}
        </h3>
        <div class="space-y-3">
          <div
            v-for="cdk in cdkData.cdks"
            :key="cdk.id"
            class="bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3">
                  <code class="bg-white px-3 py-1 rounded border text-sm font-mono">
                    {{ cdk.code }}
                  </code>
                  <button
                    @click="copyCdk(cdk.code)"
                    class="flex items-center px-2 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
                  >
                    <svg
                      class="w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    复制
                  </button>
                </div>
                <div class="mt-2 text-sm text-gray-600 flex items-center space-x-4">
                  <span>领取时间: {{ formatDate(cdk.claimedAt) }}</span>
                  <span v-if="cdk.claimedByUser && cdkData.claimMode === 'TEAM'">
                    领取人: {{ cdk.claimedByUser.username }}
                  </span>
                </div>
                <div v-if="cdk.notes" class="mt-1 text-sm text-gray-500">
                  备注: {{ cdk.notes }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-8">
        <svg
          class="w-12 h-12 mx-auto text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <p class="text-gray-600">
          {{ cdkData.claimMode === "TEAM" ? "团队尚未领取任何CDK" : "您尚未领取任何CDK" }}
        </p>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <div
      v-if="copyNotification.show"
      class="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg shadow-lg"
    >
      <div class="flex items-center">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        CDK已复制到剪贴板
      </div>
    </div>

    <!-- 通知组件 -->
    <div v-if="notification.show" class="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div
        :class="{
          'bg-green-50 border-green-200 text-green-800': notification.type === 'success',
          'bg-red-50 border-red-200 text-red-800': notification.type === 'error',
        }"
        class="border rounded-md p-4 shadow-lg"
      >
        <div class="flex items-center">
          <svg
            v-if="notification.type === 'success'"
            class="w-5 h-5 mr-2 text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            ></path>
          </svg>
          <svg
            v-else
            class="w-5 h-5 mr-2 text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            ></path>
          </svg>
          <p class="text-sm font-medium">{{ notification.message }}</p>
          <button
            @click="notification.show = false"
            class="ml-auto text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  competitionId: {
    type: String,
    required: true,
  },
});

// 状态管理
const isClaiming = ref(false);
const copyNotification = ref({ show: false });
const notification = ref({
  show: false,
  type: "success",
  message: "",
});

// 获取CDK数据
const { data: cdkData, pending, error, refresh } = await useFetch(
  `/api/competitions/${props.competitionId}/cdk/mine`,
  {
    server: false,
    default: () => ({
      cdkEnabled: false,
      cdks: [],
      stats: { claimed: 0, remaining: 0, limit: 0, available: 0 },
    }),
  }
);

// 计算属性
const canClaim = computed(() => {
  if (!cdkData.value?.cdkEnabled) return false;
  return cdkData.value.stats.remaining > 0 && cdkData.value.stats.available > 0;
});

const getClaimButtonText = computed(() => {
  if (!cdkData.value?.cdkEnabled) return "CDK功能未启用";
  if (cdkData.value.stats.remaining <= 0) return "已达领取上限";
  if (cdkData.value.stats.available <= 0) return "库存不足";
  return "领取CDK";
});

const getStatusMessage = computed(() => {
  if (!cdkData.value?.cdkEnabled) return "CDK功能未启用";
  if (cdkData.value.stats.remaining <= 0) {
    return cdkData.value.claimMode === "TEAM" ? "团队已达领取上限" : "您已达领取上限";
  }
  if (cdkData.value.stats.available <= 0) return "当前库存不足，请稍后再试";
  return "";
});

// 错误处理相关计算属性
const isEmailVerificationError = computed(() => {
  return (
    error.value?.message?.includes("请先验证邮箱") ||
    error.value?.statusMessage?.includes("请先验证邮箱")
  );
});

const getErrorTitle = computed(() => {
  if (isEmailVerificationError.value) {
    return "需要验证邮箱";
  }
  if (error.value?.statusCode === 403) {
    return "访问受限";
  }
  return "加载失败";
});

const getErrorDescription = computed(() => {
  // 尝试多种方式获取后端返回的友好消息
  const backendMessage =
    error.value?.data?.message || // Nuxt fetch 错误可能在 data 中
    error.value?.statusMessage ||
    error.value?.message;

  console.log("Error object:", error.value); // 调试用，查看错误对象结构
  console.log("Backend message:", backendMessage);

  if (
    backendMessage &&
    !backendMessage.includes("[GET]") &&
    !backendMessage.includes("http://")
  ) {
    // 如果后端消息不包含技术细节（如URL），直接使用
    return backendMessage;
  }

  // 如果后端消息包含技术细节，则使用我们的友好消息
  if (isEmailVerificationError.value) {
    return "您需要先验证邮箱才能使用 CDK 功能。";
  }
  if (error.value?.statusCode === 403) {
    return "您没有权限访问此功能。";
  }
  if (error.value?.statusCode === 404) {
    return "比赛不存在或已被删除。";
  }

  return "加载 CDK 信息时出现问题，请稍后重试。";
});

const getErrorClass = computed(() => {
  if (isEmailVerificationError.value) {
    return "bg-yellow-50 border border-yellow-200";
  }
  return "bg-red-50 border border-red-200";
});

const getErrorIconClass = computed(() => {
  if (isEmailVerificationError.value) {
    return "text-yellow-400";
  }
  return "text-red-400";
});

const getErrorTextClass = computed(() => {
  if (isEmailVerificationError.value) {
    return "text-yellow-800";
  }
  return "text-red-800";
});

const getErrorDescriptionClass = computed(() => {
  if (isEmailVerificationError.value) {
    return "text-yellow-700";
  }
  return "text-red-700";
});

// 工具函数
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("zh-CN");
};

// CDK领取
const claimCdk = async () => {
  if (!canClaim.value || isClaiming.value) return;

  isClaiming.value = true;

  try {
    const response = await $fetch(`/api/competitions/${props.competitionId}/cdk/claim`, {
      method: "POST",
    });

    if (response.success) {
      push.success("成功领取CDK！");
      await refresh(); // 刷新数据
    }
  } catch (error) {
    console.error("领取CDK失败:", error);
    push.error(error.data?.message || error.message || "领取CDK失败，请重试");
  } finally {
    isClaiming.value = false;
  }
};

// 复制CDK到剪贴板
const copyCdk = async (code) => {
  try {
    await navigator.clipboard.writeText(code);
    copyNotification.value.show = true;
    setTimeout(() => {
      copyNotification.value.show = false;
    }, 2000);
  } catch (error) {
    console.error("复制失败:", error);
    push.error("复制失败，请手动复制");
  }
};
</script>
