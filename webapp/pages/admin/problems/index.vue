<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">题目管理</h1>
        <p class="mt-2 text-gray-600">管理所有竞赛题目</p>
      </div>

      <!-- 新增题目按钮 -->
      <div class="mb-6 flex justify-end">
        <button
          @click="openModal()"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          新增题目
        </button>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="mb-6 bg-white rounded-lg shadow-md p-4">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">竞赛筛选</label>
          <select
            v-model="selectedCompetition"
            @change="fetchProblems"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部竞赛</option>
            <option
              v-for="competition in competitions"
              :key="competition.id"
              :value="competition.id"
            >
              {{ competition.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">状态筛选</label>
          <select
            v-model="selectedStatus"
            @change="fetchProblems"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="upcoming">即将开始</option>
            <option value="ongoing">进行中</option>
            <option value="ended">已结束</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="() => refresh()"
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

    <!-- 题目列表 -->
    <div v-else-if="data?.problems" class="space-y-6">
      <div
        v-for="problem in data.problems"
        :key="problem.id"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center space-x-3 mb-2">
              <h3 class="text-xl font-semibold text-gray-900">{{ problem.title }}</h3>
              <span
                :class="{
                  'bg-yellow-100 text-yellow-800': problem.status === 'upcoming',
                  'bg-green-100 text-green-800': problem.status === 'ongoing',
                  'bg-gray-100 text-gray-800': problem.status === 'ended',
                }"
                class="px-2 py-1 rounded-full text-xs font-medium"
              >
                {{ getStatusText(problem.status) }}
              </span>
            </div>

            <p class="text-gray-600 mb-4 line-clamp-2">{{ problem.shortDescription }}</p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
              <div>
                <span class="font-medium">开始时间:</span>
                {{ formatDate(problem.startTime) }}
              </div>
              <div>
                <span class="font-medium">结束时间:</span>
                {{ formatDate(problem.endTime) }}
              </div>
              <div>
                <span class="font-medium">关联竞赛:</span>
                {{ problem.competition.title }}
              </div>
            </div>

            <div class="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span>提交数: {{ problem._count?.submissions || 0 }}</span>
              <span v-if="problem.datasetUrl">数据集: 已上传</span>
              <span v-else>数据集: 未上传</span>
              <span v-if="problem.judgingScriptUrl">评测脚本: 已上传</span>
              <span v-else>评测脚本: 未上传</span>
            </div>
          </div>

          <div class="flex flex-col space-y-2 ml-6">
            <NuxtLink
              :to="`/problems/${problem.id}`"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              查看详情
            </NuxtLink>
            <button
              @click="openModal(problem)"
              class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              编辑
            </button>
            <NuxtLink
              :to="`/competitions/${problem.competition.id}`"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              查看竞赛
            </NuxtLink>
            <button
              @click="deleteProblem(problem.id)"
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
      <div class="text-gray-400 text-6xl mb-4">📝</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无题目</h3>
      <p class="text-gray-600 mb-6">开始创建你的第一个竞赛题目吧！</p>
      <NuxtLink
        :to="{
          path: '/admin/problems/create',
          query: selectedCompetition ? { competitionId: selectedCompetition } : {},
        }"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
      >
        创建新题目
      </NuxtLink>
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
  </div>

  <!-- 题目模态框 -->
  <div v-if="showModal" class="fixed inset-0 overflow-y-auto z-50">
    <div
      class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
    >
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div @click="closeModal" class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true"
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
                <form @submit.prevent="saveProblem">
                  <div class="mb-4">
                    <label
                      for="problem-competition"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      关联竞赛 *
                    </label>
                    <select
                      id="problem-competition"
                      v-model="problemForm.competitionId"
                      required
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="" disabled>请选择竞赛</option>
                      <option
                        v-for="competition in competitions"
                        :key="competition.id"
                        :value="competition.id"
                      >
                        {{ competition.title }}
                      </option>
                    </select>
                  </div>

                  <div class="mb-4">
                    <label
                      for="problem-title"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      题目标题 *
                    </label>
                    <input
                      id="problem-title"
                      v-model="problemForm.title"
                      type="text"
                      required
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入题目标题"
                    />
                  </div>

                  <div class="mb-4">
                    <label
                      for="problem-shortDescription"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      简短描述 *
                    </label>
                    <input
                      id="problem-shortDescription"
                      v-model="problemForm.shortDescription"
                      type="text"
                      required
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入简短描述"
                    />
                  </div>

                  <div class="mb-4">
                    <label
                      for="problem-detailedDescription"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      详细描述
                    </label>
                    <textarea
                      id="problem-detailedDescription"
                      v-model="problemForm.detailedDescription"
                      rows="4"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="详细描述题目内容和要求"
                    ></textarea>
                  </div>

                  <div class="mb-4">
                    <label
                      for="problem-datasetUrl"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      数据集URL
                    </label>
                    <input
                      id="problem-datasetUrl"
                      v-model="problemForm.datasetUrl"
                      type="text"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入数据集下载链接"
                    />
                  </div>

                  <div class="mb-4">
                    <label
                      for="problem-judgingScriptUrl"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      评测脚本URL
                    </label>
                    <input
                      id="problem-judgingScriptUrl"
                      v-model="problemForm.judgingScriptUrl"
                      type="text"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入评测脚本下载链接"
                    />
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label
                        for="problem-startTime"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        开始时间 *
                      </label>
                      <input
                        id="problem-startTime"
                        v-model="problemForm.startTime"
                        type="datetime-local"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label
                        for="problem-endTime"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        结束时间 *
                      </label>
                      <input
                        id="problem-endTime"
                        v-model="problemForm.endTime"
                        type="datetime-local"
                        required
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div class="mb-4">
                    <label
                      for="problem-score"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      分数
                    </label>
                    <input
                      id="problem-score"
                      v-model.number="problemForm.score"
                      type="number"
                      min="0"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入题目分数"
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            @click="saveProblem"
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
                ? "更新题目"
                : "创建题目"
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
</template>

<script setup lang="ts">
import Pagination from "~/components/common/Pagination.vue";

interface Competition {
  id: string;
  title: string;
}

interface Problem {
  id: string;
  title: string;
  shortDescription: string;
  startTime: string;
  endTime: string;
  status: string;
  datasetUrl?: string;
  judgingScriptUrl?: string;
  competition: {
    id: string;
    title: string;
  };
  _count: {
    submissions: number;
  };
}

interface ProblemsResponse {
  success: boolean;
  problems: Problem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CompetitionsResponse {
  success: boolean;
  competitions: Competition[];
}

definePageMeta({
  middleware: "admin",
});

// 筛选状态
const route = useRoute();
const selectedStatus = ref<string>("");
const selectedCompetition = ref<string>((route.query.competitionId as string) || "");
const currentPage = ref<number>(1);

// 获取竞赛列表用于筛选
const { data: competitionsData } = await useFetch<CompetitionsResponse>(
  "/api/competitions/simple"
);
const competitions = computed(() => competitionsData.value?.competitions || []);

// 获取题目列表
const { data, pending, error, refresh } = await useFetch<ProblemsResponse>(
  "/api/problems",
  {
    query: {
      status: selectedStatus,
      competitionId: selectedCompetition,
      page: currentPage,
      limit: 20, // 管理页面显示更多
    },
  }
);

const fetchProblems = () => {
  currentPage.value = 1;
  refresh();
};

const goToPage = (page: number) => {
  currentPage.value = page;
  refresh();
};

const changeItemsPerPage = (newItemsPerPage: number) => {
  // 设置新的每页显示数量，并回到第一页
  data.value.pagination.limit = newItemsPerPage;
  currentPage.value = 1;
  refresh();
};

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    upcoming: "即将开始",
    ongoing: "进行中",
    ended: "已结束",
  };
  return statusMap[status] || status;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString("zh-CN");
};

const deleteProblem = async (problemId: string) => {
  if (!confirm("确定要删除这个题目吗？此操作不可撤销。")) {
    return;
  }

  try {
    await $fetch(`/api/problems/${problemId}`, {
      method: "DELETE" as any,
    });

    // 刷新列表
    await refresh();

    // 显示成功消息
    push.success("题目删除成功");
  } catch (error: any) {
    console.error("删除题目失败:", error);
    push.error("删除题目失败: " + (error.data?.message || error.message));
  }
};

// 题目表单相关
const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const modalTitle = computed(() => (isEditing.value ? "编辑题目" : "新增题目"));

const problemForm = ref({
  id: "",
  competitionId: "",
  title: "",
  shortDescription: "",
  detailedDescription: "",
  datasetUrl: "",
  judgingScriptUrl: "",
  startTime: "",
  endTime: "",
  score: undefined as number | undefined,
});

const openModal = (problem = null) => {
  if (problem) {
    // 编辑模式
    isEditing.value = true;
    problemForm.value = {
      id: problem.id,
      competitionId: problem.competition.id,
      title: problem.title,
      shortDescription: problem.shortDescription,
      detailedDescription: problem.detailedDescription,
      datasetUrl: problem.datasetUrl || "",
      judgingScriptUrl: problem.judgingScriptUrl || "",
      startTime: new Date(problem.startTime).toISOString().slice(0, 16),
      endTime: new Date(problem.endTime).toISOString().slice(0, 16),
      score: problem.score || undefined,
    };
  } else {
    // 新增模式
    isEditing.value = false;
    problemForm.value = {
      id: "",
      competitionId: selectedCompetition.value || "",
      title: "",
      shortDescription: "",
      detailedDescription: "",
      datasetUrl: "",
      judgingScriptUrl: "",
      startTime: "",
      endTime: "",
      score: undefined,
    };

    // 设置默认时间（如果没有选择比赛，使用当前时间+1小时作为开始时间，+25小时作为结束时间）
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // +1小时
    const end = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25小时

    problemForm.value.startTime = start.toISOString().slice(0, 16);
    problemForm.value.endTime = end.toISOString().slice(0, 16);
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveProblem = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    // 验证时间
    const startDate = new Date(problemForm.value.startTime);
    const endDate = new Date(problemForm.value.endTime);

    if (startDate >= endDate) {
      push.error("结束时间必须晚于开始时间");
      isSubmitting.value = false;
      return;
    }

    let response;
    if (isEditing.value) {
      // 编辑题目
      response = await $fetch(`/api/problems/${problemForm.value.id}`, {
        method: "PUT",
        body: {
          title: problemForm.value.title,
          shortDescription: problemForm.value.shortDescription,
          detailedDescription: problemForm.value.detailedDescription,
          datasetUrl: problemForm.value.datasetUrl || undefined,
          judgingScriptUrl: problemForm.value.judgingScriptUrl || undefined,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          score: problemForm.value.score
            ? parseInt(String(problemForm.value.score))
            : undefined,
        },
      });
    } else {
      // 创建题目
      response = await $fetch(
        `/api/competitions/${problemForm.value.competitionId}/problems`,
        {
          method: "POST",
          body: {
            title: problemForm.value.title,
            shortDescription: problemForm.value.shortDescription,
            detailedDescription: problemForm.value.detailedDescription,
            datasetUrl: problemForm.value.datasetUrl || undefined,
            judgingScriptUrl: problemForm.value.judgingScriptUrl || undefined,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            score: problemForm.value.score
              ? parseInt(String(problemForm.value.score))
              : undefined,
          },
        }
      );
    }

    if (response.success) {
      closeModal();
      await refresh();

      // 显示成功消息
      push.success(isEditing.value ? "题目更新成功" : "题目创建成功");
    } else {
      push.error(isEditing.value ? "更新题目失败" : "创建题目失败");
    }
  } catch (err: any) {
    console.error("保存题目时出错:", err);
    push.error("保存题目时出错: " + (err.data?.message || err.message || "未知错误"));
  } finally {
    isSubmitting.value = false;
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
