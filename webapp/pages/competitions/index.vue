<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">比赛列表</h1>
      <p class="mt-2 text-gray-600">参加AI竞赛，展示您的技能</p>
    </div>

    <!-- 筛选器 -->
    <div class="mb-6 flex space-x-4">
      <select
        v-model="selectedStatus"
        @change="fetchCompetitions"
        class="border border-gray-300 rounded-md px-3 py-2"
      >
        <option value="">全部状态</option>
        <option value="upcoming">即将开始</option>
        <option value="ongoing">进行中</option>
        <option value="ended">已结束</option>
      </select>
    </div>

    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载比赛列表失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.competitions?.length === 0" class="text-center py-8">
      <p class="text-gray-600">暂无比赛</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="competition in data?.competitions"
        :key="competition.id"
        class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
      >
        <div v-if="competition.bannerUrl" class="h-48 bg-gray-200">
          <img
            :src="competition.bannerUrl"
            :alt="competition.title"
            class="w-full h-full object-cover"
          />
        </div>
        <div
          v-else
          class="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center"
        >
          <h3 class="text-white text-xl font-bold text-center px-4">
            {{ competition.title }}
          </h3>
        </div>

        <div class="p-6">
          <div class="flex items-center justify-between mb-2">
            <h3 v-if="competition.bannerUrl" class="text-lg font-semibold text-gray-900">
              {{ competition.title }}
            </h3>
            <span
              :class="{
                'bg-green-100 text-green-800': competition.status === 'ongoing',
                'bg-blue-100 text-blue-800': competition.status === 'upcoming',
                'bg-gray-100 text-gray-800': competition.status === 'ended',
              }"
              class="px-2 py-1 rounded-full text-xs font-medium"
            >
              {{ getStatusText(competition.status) }}
            </span>
          </div>

          <p class="text-gray-600 text-sm mb-4 line-clamp-3">
            {{ competition.description }}
          </p>

          <div class="text-sm text-gray-500 mb-4">
            <p>开始时间: {{ formatDate(competition.startTime) }}</p>
            <p>结束时间: {{ formatDate(competition.endTime) }}</p>
            <p>题目数量: {{ competition.problems?.length || 0 }}</p>
            <p>提交数量: {{ competition._count?.submissions || 0 }}</p>
          </div>

          <div class="flex space-x-2">
            <NuxtLink
              :to="`/competitions/${competition.id}`"
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              查看详情
            </NuxtLink>
            <button
              v-if="competition.status === 'ongoing' && !competition.userParticipating"
              @click="openJoinModal(competition)"
              class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              参加比赛
            </button>
            <div
              v-else-if="
                competition.status === 'ongoing' && competition.userParticipating
              "
              class="flex-1 bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium text-center cursor-not-allowed"
            >
              已参加
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div
      v-if="data?.pagination && data.pagination.totalPages > 1"
      class="mt-8 flex justify-center"
    >
      <nav class="flex space-x-2">
        <button
          v-for="page in data.pagination.totalPages"
          :key="page"
          @click="goToPage(page)"
          :class="{
            'bg-indigo-600 text-white': page === currentPage,
            'bg-white text-gray-700 hover:bg-gray-50': page !== currentPage,
          }"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium"
        >
          {{ page }}
        </button>
      </nav>
    </div>

    <!-- 参加比赛弹窗 -->
    <div
      v-if="showJoinModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="closeJoinModal"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
        @click.stop
      >
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">参加比赛</h3>
            <button @click="closeJoinModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-2">
              比赛: <span class="font-medium">{{ selectedCompetition?.title }}</span>
            </p>
            <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <div class="flex">
                <svg
                  class="w-5 h-5 text-yellow-400 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                <div>
                  <p class="text-sm text-yellow-800 font-medium">重要提示</p>
                  <p class="text-sm text-yellow-700 mt-1">
                    • 参加比赛后，您的队伍将被锁定，无法修改成员或参加其他比赛<br />
                    • 每个用户只能通过一个队伍参加同一个比赛<br />
                    • 请确认选择正确的队伍后再提交
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              选择参赛队伍
            </label>
            <div v-if="teamsLoading" class="text-center py-4">
              <div
                class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"
              ></div>
              <p class="mt-2 text-sm text-gray-600">加载队伍中...</p>
            </div>
            <div v-else-if="teamsError" class="text-red-600 text-sm">
              加载队伍失败: {{ teamsError.message }}
            </div>
            <div v-else-if="availableTeams.length === 0" class="text-gray-500 text-sm">
              <p>您没有可用的队伍参加此比赛。</p>
              <p class="mt-1">可能的原因：</p>
              <ul class="mt-1 ml-4 list-disc text-xs">
                <li>您的队伍已被锁定</li>
                <li>您的队伍已参加此比赛</li>
                <li>您还没有创建队伍</li>
              </ul>
            </div>
            <select
              v-else
              v-model="selectedTeamId"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">请选择队伍</option>
              <option v-for="team in availableTeams" :key="team.id" :value="team.id">
                {{ team.name }} ({{ team.members.length }}人)
                {{ team.isLocked ? " - 已锁定" : "" }}
              </option>
            </select>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              @click="closeJoinModal"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              取消
            </button>
            <button
              @click="confirmJoinCompetition"
              :disabled="!selectedTeamId || isJoining"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
            >
              {{ isJoining ? "参加中..." : "确认参加" }}
            </button>
          </div>
        </div>
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
// 需要认证中间件
definePageMeta({
  middleware: "auth",
});

const selectedStatus = ref("");
const currentPage = ref(1);

// 参加比赛相关状态
const showJoinModal = ref(false);
const selectedCompetition = ref(null);
const selectedTeamId = ref("");
const isJoining = ref(false);

// 通知状态
const notification = ref({
  show: false,
  type: "success", // 'success' | 'error'
  message: "",
});

const { data, pending, error, refresh } = await useFetch("/api/competitions", {
  query: {
    status: selectedStatus,
    page: currentPage,
  },
});

// 获取用户队伍
const {
  data: teamsData,
  pending: teamsLoading,
  error: teamsError,
  refresh: refreshTeams,
} = await useFetch("/api/teams", {
  server: false,
});

// 计算可用队伍（未锁定且未参加当前比赛的队伍）
const availableTeams = computed(() => {
  if (!teamsData.value?.teams || !selectedCompetition.value) return [];
  return teamsData.value.teams.filter(
    (team) =>
      !team.isLocked && !team.participatingIn?.includes(selectedCompetition.value.id)
  );
});

const fetchCompetitions = () => {
  currentPage.value = 1;
  refresh();
};

const goToPage = (page) => {
  currentPage.value = page;
  refresh();
};

const getStatusText = (status) => {
  const statusMap = {
    upcoming: "即将开始",
    ongoing: "进行中",
    ended: "已结束",
  };
  return statusMap[status] || status;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("zh-CN");
};

// 打开参加比赛弹窗
const openJoinModal = async (competition) => {
  selectedCompetition.value = competition;
  selectedTeamId.value = "";
  showJoinModal.value = true;

  // 刷新队伍列表
  await refreshTeams();
};

// 关闭参加比赛弹窗
const closeJoinModal = () => {
  showJoinModal.value = false;
  selectedCompetition.value = null;
  selectedTeamId.value = "";
  isJoining.value = false;
};

// 显示通知
const showNotification = (type, message) => {
  notification.value = {
    show: true,
    type,
    message,
  };

  // 3秒后自动隐藏
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

// 确认参加比赛
const confirmJoinCompetition = async () => {
  if (!selectedTeamId.value || !selectedCompetition.value) return;

  isJoining.value = true;

  try {
    const response = await $fetch(
      `/api/competitions/${selectedCompetition.value.id}/join`,
      {
        method: "POST",
        body: {
          teamId: selectedTeamId.value,
        },
      }
    );

    if (response.success) {
      // 显示成功消息
      showNotification("success", response.message || "成功参加比赛！");

      // 关闭弹窗
      closeJoinModal();

      // 刷新队伍列表和比赛列表
      await refreshTeams();
      await refresh();
    }
  } catch (error) {
    console.error("参加比赛失败:", error);
    showNotification(
      "error",
      error.data?.message || error.message || "参加比赛失败，请重试"
    );
  } finally {
    isJoining.value = false;
  }
};
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
