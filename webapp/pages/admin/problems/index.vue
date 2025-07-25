<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">题目管理</h1>
        <p class="mt-2 text-gray-600">管理所有竞赛题目</p>
      </div>
      <NuxtLink
        to="/admin/problems/create"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
      >
        创建新题目
      </NuxtLink>
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
            <NuxtLink
              :to="`/admin/problems/${problem.id}/edit`"
              class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center"
            >
              编辑
            </NuxtLink>
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
        to="/admin/problems/create"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
      >
        创建新题目
      </NuxtLink>
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
  </div>
</template>

<script setup lang="ts">
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
  middleware: "auth",
});

// 筛选状态
const selectedStatus = ref<string>("");
const selectedCompetition = ref<string>("");
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
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
