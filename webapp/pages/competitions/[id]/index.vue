<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 面包屑导航 -->
    <nav class="mb-4 text-sm">
      <ol class="flex items-center space-x-2 text-gray-500">
        <li>
          <NuxtLink to="/competitions" class="hover:text-primary">比赛列表</NuxtLink>
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
        <li class="text-gray-900">比赛详情</li>
      </ol>
    </nav>

    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载比赛信息失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.competition" class="space-y-8">
      <!-- 比赛头部信息 -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div v-if="data.competition.bannerUrl" class="h-48 bg-gray-200">
          <img
            :src="data.competition.bannerUrl"
            :alt="data.competition.title"
            class="w-full h-full object-cover"
          />
        </div>
        <div v-else class="h-48 banner-fallback flex items-center justify-center">
          <h1 class="text-white text-xl font-bold text-center px-4">
            {{ data.competition.title }}
          </h1>
        </div>

        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h1
              v-if="data.competition.bannerUrl"
              class="text-3xl font-bold text-gray-900"
            >
              {{ data.competition.title }}
            </h1>
            <div class="flex items-center space-x-2">
              <span
                :class="{
                  'bg-green-100 text-green-800': data.competition.status === 'ongoing',
                  'bg-blue-100 text-blue-800': data.competition.status === 'upcoming',
                  'bg-gray-100 text-gray-800': data.competition.status === 'ended',
                }"
                class="ml-4 px-3 py-1 rounded-full text-sm font-medium"
              >
                {{ getStatusText(data.competition.status) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">比赛信息</h3>
              <div class="space-y-2 text-sm text-gray-600">
                <p>
                  <span class="font-medium">开始时间:</span>
                  {{ formatDate(data.competition.startTime) }}
                </p>
                <p>
                  <span class="font-medium">结束时间:</span>
                  {{ formatDate(data.competition.endTime) }}
                </p>
                <p>
                  <span class="font-medium">创建者:</span>
                  {{ data.competition.creator.username }}
                </p>
                <p>
                  <span class="font-medium">题目数量:</span>
                  {{ data.competition.problems?.length || 0 }}
                </p>
                <p>
                  <span class="font-medium">提交数量:</span>
                  {{ data.competition._count?.submissions || 0 }}
                </p>
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">操作</h3>
              <div class="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
                <NuxtLink
                  :to="`/competitions/${data.competition.id}/leaderboard`"
                  class="flex-1 bg-primary hover:bg-primary-hover text-primary-text-light px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 transform hover:scale-105 text-center"
                >
                  查看排行榜
                </NuxtLink>
                <button
                  v-if="
                    data.competition.status === 'ongoing' &&
                    !data.competition.userParticipating
                  "
                  @click="openJoinModal"
                  class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 transform hover:scale-105"
                >
                  参加比赛
                </button>
                <!-- 题解提交按钮：结束前禁用且不可跳转 -->
                <NuxtLink
                  v-if="showSolutionButton && solutionTimeInfo.canSubmit"
                  :to="`/competitions/${data.competition.id}/solutions`"
                  class="flex-1 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 transform hover:scale-105 text-center bg-primary hover:bg-primary-hover text-primary-text-light"
                >
                  题解提交
                </NuxtLink>
                <button
                  v-else-if="showSolutionButton && !solutionTimeInfo.canSubmit"
                  type="button"
                  disabled
                  aria-disabled="true"
                  class="flex-1 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 text-center bg-gray-400 text-white cursor-not-allowed"
                >
                  题解提交
                </button>
              </div>

              <!-- 题解提交状态信息 -->
              <div
                v-if="showSolutionButton"
                class="mt-3 p-3 rounded-md border"
                :class="getSolutionStatusClass(solutionTimeInfo.statusType)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <svg
                      v-if="solutionTimeInfo.statusType === 'waiting'"
                      class="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <svg
                      v-else-if="solutionTimeInfo.statusType === 'open'"
                      class="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <svg
                      v-else
                      class="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <span class="text-sm font-medium">{{
                      solutionTimeInfo.statusText
                    }}</span>
                  </div>
                  <div v-if="solutionTimeInfo.remainingTime > 0" class="text-xs">
                    剩余: {{ solutionTimeInfo.remainingTimeText }}
                  </div>
                </div>
                <div
                  v-if="solutionTimeInfo.statusType === 'waiting'"
                  class="mt-1 text-xs opacity-75"
                >
                  比赛结束后可提交题解（2天内有效）
                </div>
                <div
                  v-else-if="solutionTimeInfo.statusType === 'open'"
                  class="mt-1 text-xs opacity-75"
                >
                  截止时间: {{ formatDate(solutionTimeInfo.deadline) }}
                </div>
              </div>
            </div>
          </div>

          <div class="prose max-w-none">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">比赛描述</h3>
            <p class="text-gray-700 whitespace-pre-wrap">
              {{ data.competition.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- 比赛规则 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">比赛规则</h2>
        <div class="prose max-w-none">
          <div class="text-gray-700 whitespace-pre-wrap">
            {{ data.competition.rules }}
          </div>
        </div>
      </div>

      <!-- CDK 领取模块 -->
      <CompetitionCdkClaim
        v-if="data?.competition?.userParticipating"
        :competition-id="data.competition.id"
      />

      <!-- 题目列表 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">题目列表</h2>

        <div v-if="problemsPending" class="text-center py-4">
          <div
            class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
          ></div>
          <p class="mt-2 text-gray-600">加载题目中...</p>
        </div>

        <div
          v-else-if="problemsError"
          class="bg-red-50 border border-red-200 rounded-md p-4"
        >
          <p class="text-red-800">加载题目失败: {{ problemsError.message }}</p>
        </div>

        <div v-else-if="problemsData?.problems?.length === 0" class="text-center py-8">
          <p class="text-gray-600">暂无题目</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="problem in problemsData?.problems"
            :key="problem.id"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <h3 class="text-lg font-semibold text-gray-900">{{ problem.title }}</h3>
                <span
                  v-if="problem.score !== null && problem.score !== undefined"
                  class="ml-3 px-2 py-1 bg-primary-bg-light text-primary rounded-full text-xs font-medium"
                >
                  {{ problem.score }} 分
                </span>
                <span
                  v-else
                  class="ml-3 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium"
                >
                  暂无分数
                </span>
              </div>
              <span
                :class="{
                  'bg-green-100 text-green-800': problem.status === 'ongoing',
                  'bg-blue-100 text-blue-800': problem.status === 'upcoming',
                  'bg-gray-100 text-gray-800': problem.status === 'ended',
                }"
                class="px-2 py-1 rounded-full text-xs font-medium"
              >
                {{ getStatusText(problem.status) }}
              </span>
            </div>

            <p class="text-gray-600 mb-3">{{ problem.shortDescription }}</p>

            <div class="flex items-center justify-between text-sm text-gray-500">
              <div>
                <span>开始: {{ formatDate(problem.startTime) }}</span>
                <span class="mx-2">|</span>
                <span>结束: {{ formatDate(problem.endTime) }}</span>
                <span class="mx-2">|</span>
                <span>提交数: {{ problem._count?.submissions || 0 }}</span>
              </div>

              <NuxtLink
                :to="`/problems/${problem.id}`"
                class="bg-primary hover:bg-primary-hover text-primary-text-light px-3 py-1 rounded text-xs font-medium"
              >
                查看详情
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">比赛不存在</p>
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
              比赛: <span class="font-medium">{{ data?.competition?.title }}</span>
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
                class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
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
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">请选择队伍</option>
              <option v-for="team in availableTeams" :key="team.id" :value="team.id">
                {{ team.name }} ({{ team.members.length }}人)
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

// 显式导入 CompetitionCdkClaim 组件
import CompetitionCdkClaim from "~/components/specific/CompetitionCdkClaim.vue";

// 导入题解工具函数
import {
  getSolutionTimeInfo,
  getSolutionStatusClass,
  canAccessSolutionSubmission,
} from "~/composables/useSolutionUtils";

const route = useRoute();
const competitionId = route.params.id;

// 参加比赛相关状态
const showJoinModal = ref(false);
const selectedTeamId = ref("");
const isJoining = ref(false);

// 通知状态
const notification = ref({
  show: false,
  type: "success", // 'success' | 'error'
  message: "",
});

const { data, pending, error, refresh } = await useFetch(
  `/api/competitions/${competitionId}`
);

const {
  data: problemsData,
  pending: problemsPending,
  error: problemsError,
} = await useFetch(`/api/competitions/${competitionId}/problems`);

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
  if (!teamsData.value?.teams || !data.value?.competition) return [];
  return teamsData.value.teams.filter(
    (team) => !team.isLocked && !team.participatingIn?.includes(data.value.competition.id)
  );
});

// 题解相关计算属性
const solutionTimeInfo = computed(() => {
  if (!data.value?.competition?.endTime) {
    return {
      canSubmit: false,
      competitionEnded: false,
      deadline: new Date(),
      remainingTime: 0,
      remainingTimeText: "",
      statusText: "加载中...",
      statusType: "waiting",
    };
  }
  return getSolutionTimeInfo(data.value.competition.endTime);
});

const showSolutionButton = computed(() => {
  if (!data.value?.competition || !teamsData.value?.teams) return false;
  return canAccessSolutionSubmission(teamsData.value.teams, data.value.competition.id);
});

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
const openJoinModal = async () => {
  selectedTeamId.value = "";
  showJoinModal.value = true;

  // 刷新队伍列表
  await refreshTeams();
};

// 关闭参加比赛弹窗
const closeJoinModal = () => {
  showJoinModal.value = false;
  selectedTeamId.value = "";
  isJoining.value = false;
};

// 确认参加比赛
const confirmJoinCompetition = async () => {
  if (!selectedTeamId.value || !data.value?.competition) return;

  isJoining.value = true;

  try {
    const response = await $fetch(`/api/competitions/${data.value.competition.id}/join`, {
      method: "POST",
      body: {
        teamId: selectedTeamId.value,
      },
    });

    if (response.success) {
      // 显示成功消息
      push.success(response.message || "成功参加比赛！");

      // 关闭弹窗
      closeJoinModal();

      // 刷新队伍列表和比赛信息
      await refreshTeams();
      await refresh();
    }
  } catch (error) {
    console.error("参加比赛失败:", error);
    push.error(error.data?.message || error.message || "参加比赛失败，请重试");
  } finally {
    isJoining.value = false;
  }
};
</script>
