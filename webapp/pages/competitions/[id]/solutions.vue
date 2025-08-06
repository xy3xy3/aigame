<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 面包屑导航 -->
    <nav class="mb-4 text-sm">
      <ol class="flex items-center space-x-2 text-gray-500">
        <li>
          <NuxtLink to="/competitions" class="hover:text-indigo-600">比赛列表</NuxtLink>
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
          <NuxtLink :to="`/competitions/${competitionId}`" class="hover:text-indigo-600">
            比赛详情
          </NuxtLink>
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
        <li class="text-gray-900">解决方案提交</li>
      </ol>
    </nav>

    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">解决方案提交</h1>
      <p class="mt-2 text-gray-600">提交比赛的解决方案文件</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="competitionPending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div
      v-else-if="competitionError"
      class="bg-red-50 border border-red-200 rounded-md p-4"
    >
      <p class="text-red-800">加载比赛信息失败: {{ competitionError.message }}</p>
    </div>

    <!-- 权限检查 -->
    <div
      v-else-if="!hasPermission"
      class="bg-yellow-50 border border-yellow-200 rounded-md p-4"
    >
      <div class="flex">
        <svg class="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <p class="text-sm text-yellow-800 font-medium">无法访问解决方案提交</p>
          <p class="text-sm text-yellow-700 mt-1">
            只有参赛团队成员才能提交解决方案。请确保您的团队已参加此比赛。
          </p>
        </div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div v-else-if="competitionData?.competition" class="space-y-8">
      <!-- 比赛信息卡片 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">比赛信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600 mb-1">比赛名称</p>
            <p class="font-medium">{{ competitionData.competition.title }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">状态</p>
            <span
              :class="{
                'bg-green-100 text-green-800':
                  competitionData.competition.status === 'ongoing',
                'bg-blue-100 text-blue-800':
                  competitionData.competition.status === 'upcoming',
                'bg-gray-100 text-gray-800':
                  competitionData.competition.status === 'ended',
              }"
              class="px-2 py-1 rounded-full text-xs font-medium"
            >
              {{ getStatusText(competitionData.competition.status) }}
            </span>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">结束时间</p>
            <p class="font-medium">
              {{ formatDate(competitionData.competition.endTime) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">题目数量</p>
            <p class="font-medium">
              {{ competitionData.competition.problems?.length || 0 }}
            </p>
          </div>
        </div>

        <!-- 解决方案提交状态信息 -->
        <div
          class="mt-4 p-3 rounded-md border"
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
              <svg v-else class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
              <span class="text-sm font-medium">{{ solutionTimeInfo.statusText }}</span>
            </div>
            <div v-if="solutionTimeInfo.remainingTime > 0" class="text-xs">
              剩余: {{ solutionTimeInfo.remainingTimeText }}
            </div>
          </div>
          <div
            v-if="solutionTimeInfo.statusType === 'waiting'"
            class="mt-1 text-xs opacity-75"
          >
            比赛结束后可提交解决方案（2天内有效）
          </div>
          <div
            v-else-if="solutionTimeInfo.statusType === 'open'"
            class="mt-1 text-xs opacity-75"
          >
            截止时间: {{ formatDate(solutionTimeInfo.deadline) }}
          </div>
        </div>
      </div>

      <!-- 解决方案上传表单 -->
      <div v-if="solutionTimeInfo.canSubmit" class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">提交解决方案</h2>

        <form @submit.prevent="submitSolution">
          <!-- 团队选择 -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              选择团队 *
            </label>
            <select
              v-model="uploadForm.teamId"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">请选择团队</option>
              <option v-for="team in participatingTeams" :key="team.id" :value="team.id">
                {{ team.name }}
              </option>
            </select>
          </div>

          <!-- 文件上传 -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              上传解决方案文件 *
            </label>
            <div
              @drop="handleDrop"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              :class="{
                'border-indigo-500 bg-indigo-50': isDragOver,
                'border-gray-300': !isDragOver,
              }"
              class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors"
            >
              <div class="space-y-1 text-center">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <div class="flex text-sm text-gray-600">
                  <label
                    for="file-upload"
                    class="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>选择文件</span>
                    <input
                      id="file-upload"
                      ref="fileInputRef"
                      type="file"
                      class="sr-only"
                      accept=".pdf"
                      @change="handleFileSelect"
                    />
                  </label>
                  <p class="pl-1">或将文件拖拽到此处</p>
                </div>
                <p class="text-xs text-gray-500">只支持 PDF 格式，最大 50MB</p>
              </div>
            </div>

            <!-- 已选择的文件 -->
            <div v-if="selectedFile" class="mt-4 p-3 bg-gray-50 rounded-md">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <svg
                    class="flex-shrink-0 h-5 w-5 text-gray-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="text-sm font-medium">{{ selectedFile.name }}</span>
                  <span class="ml-2 text-xs text-gray-500">
                    ({{ formatFileSize(selectedFile.size) }})
                  </span>
                </div>
                <button
                  @click="removeFile"
                  type="button"
                  class="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  移除
                </button>
              </div>
            </div>
          </div>

          <!-- 上传进度 -->
          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">上传进度</span>
              <span class="text-sm text-gray-500">{{ uploadProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: uploadProgress + '%' }"
              ></div>
            </div>
          </div>

          <!-- 提交按钮 -->
          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="isUploading || !canSubmitForm"
              :class="{
                'bg-indigo-600 hover:bg-indigo-700': !isUploading && canSubmitForm,
                'bg-indigo-400 cursor-not-allowed': isUploading || !canSubmitForm,
              }"
              class="text-white px-6 py-2 rounded-md text-sm font-medium"
            >
              {{ isUploading ? "上传中..." : "提交解决方案" }}
            </button>
          </div>
        </form>
      </div>

      <!-- 已提交的解决方案列表 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">已提交的解决方案</h2>
          <button
            @click="refreshSolutions"
            :disabled="solutionsPending"
            class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            {{ solutionsPending ? "刷新中..." : "刷新" }}
          </button>
        </div>

        <div v-if="solutionsPending" class="text-center py-8">
          <div
            class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"
          ></div>
          <p class="mt-2 text-gray-600">加载解决方案中...</p>
        </div>

        <div
          v-else-if="solutionsError"
          class="bg-red-50 border border-red-200 rounded-md p-4"
        >
          <p class="text-red-800">加载解决方案失败: {{ solutionsError.message }}</p>
        </div>

        <div v-else-if="solutionsData?.solutions?.length === 0" class="text-center py-8">
          <p class="text-gray-600">暂无已提交的解决方案</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="solution in solutionsData?.solutions"
            :key="solution.id"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ solution.fileName }}
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  {{ formatFileSize(solution.fileSize) }}
                </p>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">
                  {{ formatDate(solution.createdAt) }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <p class="text-sm text-gray-600 mb-1">团队</p>
                <p class="font-medium">{{ solution.team.name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 mb-1">提交者</p>
                <p class="font-medium">{{ solution.user.username }}</p>
              </div>
            </div>

            <div class="flex items-center justify-end">
              <div class="flex space-x-2">
                <button
                  @click="viewSolution(solution.id)"
                  class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  查看详情
                </button>
                <button
                  @click="downloadSolution(solution.id)"
                  class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium"
                >
                  下载
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div
          v-if="solutionsData?.pagination && solutionsData.pagination.totalPages > 1"
          class="mt-6 flex justify-center"
        >
          <nav class="flex space-x-2">
            <button
              v-for="page in solutionsData.pagination.totalPages"
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
      </div>
    </div>

    <!-- 通知组件 -->
    <div v-if="notification.show" class="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div
        :class="{
          'bg-green-50 border-green-200 text-green-800': notification.type === 'success',
          'bg-red-50 border-red-200 text-red-800': notification.type === 'error',
          'bg-yellow-50 border-yellow-200 text-yellow-800':
            notification.type === 'warning',
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
            v-else-if="notification.type === 'warning'"
            class="w-5 h-5 mr-2 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
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

// 导入工具函数
import {
  getSolutionTimeInfo,
  getSolutionStatusClass,
  canAccessSolutionSubmission,
  getParticipatingTeams,
} from "~/composables/useSolutionUtils";

const route = useRoute();
const router = useRouter();
const competitionId = route.params.id;

// 响应式状态
const selectedFile = ref(null);
const isDragOver = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const currentPage = ref(1);

// 上传表单数据
const uploadForm = ref({
  teamId: "",
});

// 通知状态
const notification = ref({
  show: false,
  type: "success", // 'success' | 'error' | 'warning'
  message: "",
});

// 文件输入引用
const fileInputRef = ref(null);

// 获取比赛信息
const {
  data: competitionData,
  pending: competitionPending,
  error: competitionError,
} = await useFetch(`/api/competitions/${competitionId}`);

// 获取用户团队
const { data: teamsData } = await useFetch("/api/teams");

// 获取题解列表
const {
  data: solutionsData,
  pending: solutionsPending,
  error: solutionsError,
  refresh: refreshSolutions,
} = await useFetch(`/api/competitions/${competitionId}/solutions`, {
  query: {
    page: currentPage,
  },
});

// 计算属性
const hasPermission = computed(() => {
  if (!competitionData.value?.competition || !teamsData.value?.teams) return false;
  return canAccessSolutionSubmission(teamsData.value.teams, competitionId);
});

const solutionTimeInfo = computed(() => {
  if (!competitionData.value?.competition?.endTime) {
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
  return getSolutionTimeInfo(competitionData.value.competition.endTime);
});

const participatingTeams = computed(() => {
  if (!teamsData.value?.teams) return [];
  return getParticipatingTeams(teamsData.value.teams, competitionId);
});

const canSubmitForm = computed(() => {
  return uploadForm.value.teamId && selectedFile.value && !isUploading.value;
});

// 工具函数
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

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 文件处理函数
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    validateAndSetFile(file);
  }
};

const handleDrop = (event) => {
  event.preventDefault();
  isDragOver.value = false;

  const file = event.dataTransfer.files[0];
  if (file) {
    validateAndSetFile(file);
  }
};

const handleDragOver = (event) => {
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  isDragOver.value = false;
};

const validateAndSetFile = (file) => {
  // 检查文件大小
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    push.error("文件大小不能超过 50MB");
    return;
  }

  // 检查文件格式
  const allowedExtensions = [".pdf"];
  const fileName = file.name.toLowerCase();
  const isValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));

  if (!isValidExtension) {
    push.error("只支持 PDF 格式的文件");
    return;
  }

  selectedFile.value = file;
};

const removeFile = () => {
  selectedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};

// 题解提交
const submitSolution = async () => {
  if (!canSubmitForm.value) return;

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const formData = new FormData();
    formData.append("file", selectedFile.value);
    formData.append("competitionId", competitionId);
    formData.append("teamId", uploadForm.value.teamId);

    // 模拟上传进度
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += Math.random() * 10;
      }
    }, 200);

    const response = await $fetch("/api/solutions/upload", {
      method: "POST",
      body: formData,
    });

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    if (response.success) {
      push.success("解决方案提交成功！");

      // 重置表单
      uploadForm.value = {
        teamId: "",
      };
      removeFile();

      // 刷新解决方案列表
      await refreshSolutions();
    }
  } catch (error) {
    console.error("解决方案提交失败:", error);
    push.error(error.data?.message || error.message || "解决方案提交失败，请重试");
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

// 查看解决方案详情
const viewSolution = async (solutionId) => {
  try {
    const response = await $fetch(`/api/solutions/${solutionId}`);
    if (response.success && response.solution.downloadUrl) {
      window.open(response.solution.downloadUrl, "_blank");
    } else {
      push.warning("无法预览此文件，请尝试下载");
    }
  } catch (error) {
    console.error("获取解决方案详情失败:", error);
    push.error("获取解决方案详情失败");
  }
};

// 下载解决方案
const downloadSolution = async (solutionId) => {
  try {
    const response = await $fetch(`/api/solutions/${solutionId}`);
    if (response.success && response.solution.downloadUrl) {
      const link = document.createElement("a");
      link.href = response.solution.downloadUrl;
      link.download = response.solution.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      push.error("无法获取下载链接");
    }
  } catch (error) {
    console.error("下载解决方案失败:", error);
    push.error("下载解决方案失败");
  }
};

// 分页
const goToPage = (page) => {
  currentPage.value = page;
  refreshSolutions();
};

// 监听路由参数变化
watch(
  () => route.params.id,
  (newId) => {
    if (newId !== competitionId) {
      router.push(`/competitions/${newId}/solutions`);
    }
  }
);
</script>

<style scoped>
/* 拖拽上传样式 */
.drag-over {
  border-color: #4f46e5;
  background-color: #f0f9ff;
}

/* 文件列表样式 */
.file-item {
  transition: all 0.2s ease;
}

.file-item:hover {
  background-color: #f9fafb;
}

/* 上传进度条动画 */
.progress-bar {
  transition: width 0.3s ease;
}

/* 通知动画 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
