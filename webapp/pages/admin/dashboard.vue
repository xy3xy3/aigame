<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">管理员仪表板</h1>
      <p class="mt-2 text-gray-600">系统状态监控和管理</p>
    </div>

    <!-- 系统统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
              <svg
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">总用户数</dt>
              <dd class="text-lg font-medium text-gray-900">{{ stats.users || 0 }}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
              <svg
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                ></path>
              </svg>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">总队伍数</dt>
              <dd class="text-lg font-medium text-gray-900">{{ stats.teams || 0 }}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                ></path>
              </svg>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">总比赛数</dt>
              <dd class="text-lg font-medium text-gray-900">
                {{ stats.competitions || 0 }}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dl>
              <dt class="text-sm font-medium text-gray-500 truncate">总提交数</dt>
              <dd class="text-lg font-medium text-gray-900">
                {{ stats.submissions || 0 }}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <!-- 队列状态 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900">评测队列状态</h2>
        <button
          @click="refreshQueueStats"
          :disabled="isRefreshingQueue"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {{ isRefreshingQueue ? "刷新中..." : "刷新" }}
        </button>
      </div>

      <div v-if="queueStats" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-yellow-50 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-yellow-600">{{ queueStats.waiting }}</div>
          <div class="text-sm text-gray-600">等待中</div>
        </div>
        <div class="bg-blue-50 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-600">{{ queueStats.active }}</div>
          <div class="text-sm text-gray-600">处理中</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-600">{{ queueStats.completed }}</div>
          <div class="text-sm text-gray-600">已完成</div>
        </div>
        <div class="bg-red-50 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-red-600">{{ queueStats.failed }}</div>
          <div class="text-sm text-gray-600">失败</div>
        </div>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-600">无法获取队列状态</p>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">快速操作</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <NuxtLink
          to="/admin/competitions"
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-center font-medium"
        >
          比赛管理
        </NuxtLink>
        <NuxtLink
          to="/admin/problems"
          class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md text-center font-medium"
        >
          题目管理
        </NuxtLink>
        <NuxtLink
          to="/admin/users"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md text-center font-medium"
        >
          用户管理
        </NuxtLink>
        <NuxtLink
          to="/admin/teams"
          class="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-md text-center font-medium"
        >
          队伍管理
        </NuxtLink>
        <button
          @click="startWorker"
          :disabled="isStartingWorker"
          class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50"
        >
          {{ isStartingWorker ? "启动中..." : "启动评测工作器" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "admin",
});

const stats = ref({
  users: 0,
  teams: 0,
  competitions: 0,
  submissions: 0,
});

const queueStats = ref(null);
const isRefreshingQueue = ref(false);
const isStartingWorker = ref(false);

const fetchStats = async () => {
  try {
    const data = await $fetch("/api/admin/stats");
    stats.value = data;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
  }
};

const refreshQueueStats = async () => {
  isRefreshingQueue.value = true;
  try {
    const data = await $fetch("/api/admin/queue/stats");
    queueStats.value = data.stats;
  } catch (error) {
    console.error("Failed to fetch queue stats:", error);
    queueStats.value = null;
  } finally {
    isRefreshingQueue.value = false;
  }
};

const startWorker = async () => {
  isStartingWorker.value = true;
  try {
    await $fetch("/api/admin/queue/start", {
      method: "POST",
    });
    push.success("评测工作器启动成功！");
  } catch (error) {
    push.error("启动评测工作器失败: " + (error.data?.message || error.message));
  } finally {
    isStartingWorker.value = false;
  }
};

// 定义清理函数变量
let intervalId = null;

onMounted(async () => {
  await fetchStats();
  await refreshQueueStats();

  // 每30秒自动刷新队列状态
  intervalId = setInterval(refreshQueueStats, 30000);
});

// 在组件卸载时清理定时器
onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>
