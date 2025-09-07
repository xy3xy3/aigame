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
        <li class="text-gray-900">比赛管理</li>
      </ol>
    </nav>

    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">比赛管理</h1>
      </div>
      <button
        @click="openModal()"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
      >
        新建比赛
      </button>
    </div>

    <!-- 筛选器 -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-4">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">状态筛选</label>
          <select
            v-model="selectedStatus"
            @change="fetchCompetitions"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm admin-select"
          >
            <option value="">全部状态</option>
            <option value="upcoming">即将开始</option>
            <option value="ongoing">进行中</option>
            <option value="ended">已结束</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="refresh"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            刷新
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
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 比赛列表 -->
    <div v-else-if="data?.competitions" class="space-y-6">
      <div
        v-for="competition in data.competitions"
        :key="competition.id"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center space-x-3 mb-2">
              <h3 class="text-xl font-semibold text-gray-900">{{ competition.title }}</h3>
              <span
                :class="{
                  'bg-yellow-100 text-yellow-800': competition.status === 'upcoming',
                  'bg-green-100 text-green-800': competition.status === 'ongoing',
                  'bg-gray-100 text-gray-800': competition.status === 'ended',
                }"
                class="px-2 py-1 rounded-full text-xs font-medium"
              >
                {{ getStatusText(competition.status) }}
              </span>
            </div>

            <p class="text-gray-600 mb-4 line-clamp-2">{{ competition.description }}</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
              <div>
                <span class="font-medium">开始时间:</span>
                {{ formatDate(competition.startTime) }}
              </div>
              <div>
                <span class="font-medium">结束时间:</span>
                {{ formatDate(competition.endTime) }}
              </div>
              <div>
                <span class="font-medium">创建者:</span>
                {{ competition.creator.username }}
              </div>
            </div>

            <div class="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span>题目数: {{ competition.problems?.length || 0 }}</span>
              <span>提交数: {{ competition._count?.submissions || 0 }}</span>
              <span
                >题解提交截止:
                {{ competition.solutionSubmissionDeadlineDays || 2 }}天</span
              >
            </div>
          </div>

          <div class="flex flex-col space-y-2 ml-6">
            <NuxtLink
              :to="`/competitions/${competition.id}`"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              查看详情
            </NuxtLink>
            <button
              @click="openModal(competition)"
              class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              编辑
            </button>
            <NuxtLink
              :to="{ path: '/admin/problems', query: { competitionId: competition.id } }"
              class="bg-primary hover:bg-primary-hover text-primary-text-light px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              题目管理
            </NuxtLink>
            <NuxtLink
              :to="`/competitions/${competition.id}/leaderboard`"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              排行榜
            </NuxtLink>
            <button
              @click="openCdkSettingsModal(competition)"
              class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              CDK设置
            </button>
            <NuxtLink
              :to="`/admin/competitions/${competition.id}/cdk`"
              class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              CDK管理
            </NuxtLink>
            <button
              @click="deleteCompetition(competition.id)"
              class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 text-6xl mb-4">🏆</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无比赛</h3>
      <p class="text-gray-600 mb-6">开始创建你的第一个AI竞赛吧！</p>
      <button
        @click="openModal()"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
      >
        创建新比赛
      </button>
    </div>

    <!-- 分页 -->
    <div
      v-if="data?.pagination && data.pagination.total > data.pagination.limit"
      class="mt-6"
    >
      <Pagination
        :current-page="data.pagination.page"
        :total-pages="data.pagination.totalPages"
        :total-items="data.pagination.total"
        :items-per-page="data.pagination.limit"
        @page-change="goToPage"
        @items-per-page-change="changeItemsPerPage"
      />
    </div>

    <!-- 比赛模态框 -->
    <div v-if="showModal" class="fixed inset-0 overflow-y-auto z-50">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
          >&#8203;</span
        >

        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {{ modalTitle }}
                </h3>
                <div class="mt-2">
                  <form @submit.prevent="saveCompetition">
                    <div class="mb-4">
                      <label
                        for="competition-title"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        比赛标题 *
                      </label>
                      <input
                        id="competition-title"
                        v-model="competitionForm.title"
                        type="text"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="输入比赛标题"
                      />
                    </div>
                    <div class="mb-4">
                      <label
                        for="competition-description"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        比赛描述 *
                      </label>
                      <textarea
                        id="competition-description"
                        v-model="competitionForm.description"
                        rows="4"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="详细描述比赛内容和目标"
                      ></textarea>
                    </div>
                    <div class="mb-4">
                      <label
                        for="competition-rules"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        比赛规则 *
                      </label>
                      <textarea
                        id="competition-rules"
                        v-model="competitionForm.rules"
                        rows="6"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="详细说明比赛规则、评分标准等"
                      ></textarea>
                    </div>
                    <div class="mb-4">
                      <label
                        for="competition-banner"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        比赛横幅
                      </label>
                      <div class="mt-2 flex items-center space-x-4">
                        <div class="flex-shrink-0">
                          <img
                            v-if="bannerPreview"
                            :src="bannerPreview"
                            alt="横幅预览"
                            class="h-16 w-auto rounded-md object-cover"
                          />
                          <div
                            v-else
                            class="h-16 w-32 flex items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-400"
                          >
                            图片预览
                          </div>
                        </div>
                        <div class="flex-grow">
                          <input
                            id="competition-banner"
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="handleBannerUpload"
                          />
                          <label
                            for="competition-banner"
                            class="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                          >
                            上传图片
                          </label>
                          <p v-if="uploading" class="mt-1 text-sm text-gray-500">
                            上传中...
                          </p>
                          <p v-if="uploadError" class="mt-1 text-sm text-red-600">
                            {{ uploadError }}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <label
                          for="competition-startTime"
                          class="block text-sm font-medium text-gray-700 mb-1"
                        >
                          开始时间 *
                        </label>
                        <input
                          id="competition-startTime"
                          v-model="competitionForm.startTime"
                          type="datetime-local"
                          required
                          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label
                          for="competition-endTime"
                          class="block text-sm font-medium text-gray-700 mb-1"
                        >
                          结束时间 *
                        </label>
                        <input
                          id="competition-endTime"
                          v-model="competitionForm.endTime"
                          type="datetime-local"
                          required
                          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div class="mb-4">
                      <label
                        for="competition-solutionSubmissionDeadlineDays"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        题解提交截止天数 *
                      </label>
                      <input
                        id="competition-solutionSubmissionDeadlineDays"
                        v-model.number="competitionForm.solutionSubmissionDeadlineDays"
                        type="number"
                        min="1"
                        max="30"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="输入题解提交截止天数"
                      />
                      <p class="mt-1 text-sm text-gray-500">
                        设置比赛结束后多少天内可以提交题解，范围：1-30天，默认为2天
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="saveCompetition"
              type="button"
              :disabled="isSubmitting"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {{
                isSubmitting
                  ? isEditing
                    ? "更新中..."
                    : "创建中..."
                  : isEditing
                  ? "更新比赛"
                  : "创建比赛"
              }}
            </button>
            <button
              @click="closeModal"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CDK设置模态框 -->
    <div v-if="showCdkModal" class="fixed inset-0 overflow-y-auto z-50">
      <div
        class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
          >&#8203;</span
        >

        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  CDK 设置 - {{ selectedCompetition?.title }}
                </h3>
                <div class="mt-2">
                  <form @submit.prevent="saveCdkSettings">
                    <!-- CDK功能开关 -->
                    <div class="mb-6">
                      <label class="flex items-center">
                        <input
                          v-model="cdkForm.cdkEnabled"
                          type="checkbox"
                          class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                        <span class="ml-2 text-sm font-medium text-gray-700"
                          >启用 CDK 功能</span
                        >
                      </label>
                      <p class="mt-1 text-sm text-gray-500">
                        启用后，参赛者需要通过 CDK 代码才能参与比赛
                      </p>
                    </div>

                    <!-- CDK设置选项（仅在启用时显示） -->
                    <div v-if="cdkForm.cdkEnabled" class="space-y-4">
                      <!-- 领取方式 -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                          领取方式 *
                        </label>
                        <div class="space-y-2">
                          <label class="flex items-center">
                            <input
                              v-model="cdkForm.cdkClaimMode"
                              type="radio"
                              value="TEAM"
                              class="text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <span class="ml-2 text-sm text-gray-700">按团队领取</span>
                          </label>
                          <label class="flex items-center">
                            <input
                              v-model="cdkForm.cdkClaimMode"
                              type="radio"
                              value="MEMBER"
                              class="text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <span class="ml-2 text-sm text-gray-700">按成员领取</span>
                          </label>
                        </div>
                        <p class="mt-1 text-sm text-gray-500">
                          团队模式：每个团队可领取指定数量的CDK；成员模式：每个成员可领取指定数量的CDK
                        </p>
                      </div>

                      <!-- 每单位限制数量 -->
                      <div>
                        <label
                          for="cdk-per-unit-limit"
                          class="block text-sm font-medium text-gray-700 mb-1"
                        >
                          每{{
                            cdkForm.cdkClaimMode === "TEAM" ? "团队" : "成员"
                          }}限制数量 *
                        </label>
                        <input
                          id="cdk-per-unit-limit"
                          v-model.number="cdkForm.cdkPerUnitLimit"
                          type="number"
                          min="1"
                          max="100"
                          required
                          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="输入限制数量"
                        />
                        <p class="mt-1 text-sm text-gray-500">
                          设置每个{{
                            cdkForm.cdkClaimMode === "TEAM" ? "团队" : "成员"
                          }}最多可以领取多少个CDK，范围：1-100
                        </p>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="saveCdkSettings"
              type="button"
              :disabled="isCdkSubmitting"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {{ isCdkSubmitting ? "保存中..." : "保存设置" }}
            </button>
            <button
              @click="closeCdkModal"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Pagination from "~/components/common/Pagination.vue";
import { convertLocalToUTC } from "~/composables/useDateUtils";

definePageMeta({
  middleware: "admin",
});

const selectedStatus = ref("");
const currentPage = ref(1);

const { data, pending, error, refresh } = await useFetch("/api/admin/competitions", {
  query: {
    status: selectedStatus,
    page: currentPage,
    limit: 20, // 管理页面显示更多
  },
});

const fetchCompetitions = () => {
  currentPage.value = 1;
  refresh();
};

const goToPage = (page) => {
  currentPage.value = page;
  refresh();
};

const changeItemsPerPage = (newItemsPerPage) => {
  // 设置新的每页显示数量，并回到第一页
  data.value.pagination.limit = newItemsPerPage;
  currentPage.value = 1;
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

const deleteCompetition = async (competitionId) => {
  if (!confirm("确定要删除这个比赛吗？此操作不可撤销。")) {
    return;
  }

  try {
    await $fetch(`/api/admin/competitions/${competitionId}`, {
      method: "DELETE",
    });

    // 刷新列表
    await refresh();

    // 显示成功消息
    push.success("比赛删除成功");
  } catch (error) {
    console.error("删除比赛失败:", error);
    push.error("删除比赛失败: " + (error.data?.message || error.message));
  }
};

// 比赛表单相关
const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const modalTitle = computed(() => (isEditing.value ? "编辑比赛" : "创建比赛"));

const competitionForm = ref({
  id: "",
  title: "",
  description: "",
  rules: "",
  bannerUrl: "",
  startTime: "",
  endTime: "",
  solutionSubmissionDeadlineDays: 2,
});

const bannerPreview = ref("");
const uploading = ref(false);
const uploadError = ref("");

const openModal = (competition = null) => {
  if (competition) {
    // 编辑模式
    isEditing.value = true;
    competitionForm.value = {
      id: competition.id,
      title: competition.title,
      description: competition.description,
      rules: competition.rules,
      bannerUrl: competition.bannerUrl || "",
      startTime: new Date(competition.startTime).toISOString().slice(0, 16),
      endTime: new Date(competition.endTime).toISOString().slice(0, 16),
      solutionSubmissionDeadlineDays: competition.solutionSubmissionDeadlineDays || 2,
    };
    bannerPreview.value = competition.bannerUrl || "";
  } else {
    // 新增模式
    isEditing.value = false;
    competitionForm.value = {
      id: "",
      title: "",
      description: "",
      rules: "",
      bannerUrl: "",
      startTime: "",
      endTime: "",
      solutionSubmissionDeadlineDays: 2,
    };
    bannerPreview.value = "";

    // 设置默认时间（当前时间+1小时作为开始时间，+25小时作为结束时间）
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // +1小时
    const end = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25小时

    competitionForm.value.startTime = start.toISOString().slice(0, 16);
    competitionForm.value.endTime = end.toISOString().slice(0, 16);
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const handleBannerUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  bannerPreview.value = URL.createObjectURL(file);
  uploading.value = true;
  uploadError.value = "";

  const formData = new FormData();
  formData.append("banner", file);

  try {
    const data = await $fetch("/api/admin/competitions/banner/upload", {
      method: "POST",
      body: formData,
    });
    competitionForm.value.bannerUrl = data.url;
  } catch (err) {
    uploadError.value = err.data?.message || "上传失败";
    bannerPreview.value = isEditing.value ? competitionForm.value.bannerUrl : ""; // 恢复到原始图片
  } finally {
    uploading.value = false;
  }
};

const saveCompetition = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    // 验证时间
    const startDate = new Date(competitionForm.value.startTime);
    const endDate = new Date(competitionForm.value.endTime);

    if (startDate >= endDate) {
      push.error("结束时间必须晚于开始时间");
      isSubmitting.value = false;
      return;
    }

    // 验证题解提交截止天数
    const deadlineDays = competitionForm.value.solutionSubmissionDeadlineDays;
    if (!deadlineDays || deadlineDays < 1 || deadlineDays > 30) {
      push.error("题解提交截止天数必须在1-30天之间");
      isSubmitting.value = false;
      return;
    }

    let response;
    if (isEditing.value) {
      // 编辑比赛
      response = await $fetch(`/api/admin/competitions/${competitionForm.value.id}`, {
        method: "PUT",
        body: {
          title: competitionForm.value.title,
          description: competitionForm.value.description,
          rules: competitionForm.value.rules,
          bannerUrl: competitionForm.value.bannerUrl || undefined,
          startTime: convertLocalToUTC(competitionForm.value.startTime),
          endTime: convertLocalToUTC(competitionForm.value.endTime),
          solutionSubmissionDeadlineDays:
            competitionForm.value.solutionSubmissionDeadlineDays,
        },
      });
    } else {
      // 创建比赛
      response = await $fetch("/api/admin/competitions", {
        method: "POST",
        body: {
          title: competitionForm.value.title,
          description: competitionForm.value.description,
          rules: competitionForm.value.rules,
          bannerUrl: competitionForm.value.bannerUrl || undefined,
          startTime: convertLocalToUTC(competitionForm.value.startTime),
          endTime: convertLocalToUTC(competitionForm.value.endTime),
          solutionSubmissionDeadlineDays:
            competitionForm.value.solutionSubmissionDeadlineDays,
        },
      });
    }

    if (response.success) {
      closeModal();
      await refresh();

      // 显示成功消息
      push.success(isEditing.value ? "比赛更新成功" : "比赛创建成功");
    } else {
      push.error(isEditing.value ? "更新比赛失败" : "创建比赛失败");
    }
  } catch (err) {
    console.error("保存比赛时出错:", err);
    push.error("保存比赛时出错: " + (err.data?.message || err.message || "未知错误"));
  } finally {
    isSubmitting.value = false;
  }
};

// CDK设置相关
const showCdkModal = ref(false);
const selectedCompetition = ref(null);
const isCdkSubmitting = ref(false);

const cdkForm = ref({
  cdkEnabled: false,
  cdkClaimMode: "TEAM",
  cdkPerUnitLimit: 1,
});

const openCdkSettingsModal = (competition) => {
  selectedCompetition.value = competition;
  cdkForm.value = {
    cdkEnabled: competition.cdkEnabled || false,
    cdkClaimMode: competition.cdkClaimMode || "TEAM",
    cdkPerUnitLimit: competition.cdkPerUnitLimit || 1,
  };
  showCdkModal.value = true;
};

const closeCdkModal = () => {
  showCdkModal.value = false;
  selectedCompetition.value = null;
};

const saveCdkSettings = async () => {
  if (isCdkSubmitting.value || !selectedCompetition.value) return;

  // 验证表单
  if (cdkForm.value.cdkEnabled) {
    if (!cdkForm.value.cdkClaimMode) {
      push.error("请选择领取方式");
      return;
    }
    if (
      !cdkForm.value.cdkPerUnitLimit ||
      cdkForm.value.cdkPerUnitLimit < 1 ||
      cdkForm.value.cdkPerUnitLimit > 100
    ) {
      push.error("每单位限制数量必须在1-100之间");
      return;
    }
  }

  isCdkSubmitting.value = true;

  try {
    const response = await $fetch(
      `/api/admin/competitions/${selectedCompetition.value.id}/cdk-settings`,
      {
        method: "PUT",
        body: {
          cdkEnabled: cdkForm.value.cdkEnabled,
          cdkClaimMode: cdkForm.value.cdkEnabled ? cdkForm.value.cdkClaimMode : undefined,
          cdkPerUnitLimit: cdkForm.value.cdkEnabled
            ? cdkForm.value.cdkPerUnitLimit
            : undefined,
        },
      }
    );

    if (response.success) {
      closeCdkModal();
      await refresh();
      push.success("CDK设置保存成功");
    } else {
      push.error("CDK设置保存失败");
    }
  } catch (err) {
    console.error("保存CDK设置时出错:", err);
    push.error("保存CDK设置时出错: " + (err.data?.message || err.message || "未知错误"));
  } finally {
    isCdkSubmitting.value = false;
  }
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
