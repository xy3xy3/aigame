<template>
  <div class="max-w-4xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">编辑题目</h1>
      <p class="mt-2 text-gray-600">修改题目信息</p>
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

    <!-- 编辑表单 -->
    <form
      v-else-if="data?.problem"
      @submit.prevent="handleSubmit"
      class="bg-white rounded-lg shadow-md p-6 space-y-6"
    >
      <!-- 所属竞赛（只读） -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"> 所属竞赛 </label>
        <div
          class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600"
        >
          {{ data.problem.competition.title }}
        </div>
      </div>

      <!-- 题目标题 -->
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
          题目标题 *
        </label>
        <input
          id="title"
          v-model="form.title"
          type="text"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="输入题目标题"
        />
      </div>

      <!-- 简短描述 -->
      <div>
        <label
          for="shortDescription"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          简短描述 *
        </label>
        <textarea
          id="shortDescription"
          v-model="form.shortDescription"
          rows="3"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="简要描述题目内容"
        ></textarea>
        <p class="mt-1 text-sm text-gray-500">{{ form.shortDescription.length }} 字符</p>
      </div>

      <!-- 详细描述 -->
      <div>
        <label
          for="detailedDescription"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          详细描述 *
        </label>
        <textarea
          id="detailedDescription"
          v-model="form.detailedDescription"
          rows="8"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="详细描述题目要求、数据格式、评分标准等"
        ></textarea>
        <p class="mt-1 text-sm text-gray-500">
          {{ form.detailedDescription.length }} 字符
        </p>
      </div>

      <!-- 数据集URL -->
      <div>
        <label for="datasetUrl" class="block text-sm font-medium text-gray-700 mb-2">
          数据集URL
        </label>
        <input
          id="datasetUrl"
          v-model="form.datasetUrl"
          type="url"
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://example.com/dataset.zip"
        />
      </div>

      <!-- 评测脚本URL -->
      <div>
        <label
          for="judgingScriptUrl"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          评测脚本URL
        </label>
        <input
          id="judgingScriptUrl"
          v-model="form.judgingScriptUrl"
          type="url"
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://example.com/judge.py"
        />
      </div>

      <!-- 题目分数 -->
      <div>
        <label for="score" class="block text-sm font-medium text-gray-700 mb-2">
          题目分数
        </label>
        <input
          id="score"
          v-model="form.score"
          type="number"
          min="1"
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="输入题目分数"
        />
        <p class="mt-1 text-sm text-gray-500">请输入正整数</p>
      </div>

      <!-- 时间设置 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="startTime" class="block text-sm font-medium text-gray-700 mb-2">
            开始时间 *
          </label>
          <input
            id="startTime"
            v-model="form.startTime"
            type="datetime-local"
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="endTime" class="block text-sm font-medium text-gray-700 mb-2">
            结束时间 *
          </label>
          <input
            id="endTime"
            v-model="form.endTime"
            type="datetime-local"
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-end space-x-4">
        <NuxtLink
          to="/admin/problems"
          class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium"
        >
          取消
        </NuxtLink>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
        >
          {{ isSubmitting ? "更新中..." : "更新题目" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
interface Problem {
  id: string;
  title: string;
  shortDescription: string;
  detailedDescription: string;
  datasetUrl?: string;
  judgingScriptUrl?: string;
  startTime: string;
  endTime: string;
  competition: {
    id: string;
    title: string;
  };
  score?: number;
}

interface ProblemResponse {
  success: boolean;
  problem: Problem;
}

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const problemId = route.params.id as string;

// 获取题目数据
const { data, pending, error, refresh } = await useFetch<ProblemResponse>(
  `/api/problems/${problemId}`
);

const form = reactive({
  title: "",
  shortDescription: "",
  detailedDescription: "",
  datasetUrl: "",
  judgingScriptUrl: "",
  startTime: "",
  endTime: "",
  score: undefined as number | undefined,
});

const isSubmitting = ref(false);

// 当数据加载完成后，填充表单
watch(
  data,
  (newData) => {
    if (newData?.problem) {
      const problem = newData.problem;
      form.title = problem.title;
      form.shortDescription = problem.shortDescription;
      form.detailedDescription = problem.detailedDescription;
      form.datasetUrl = problem.datasetUrl || "";
      form.judgingScriptUrl = problem.judgingScriptUrl || "";
      form.startTime = new Date(problem.startTime).toISOString().slice(0, 16);
      form.endTime = new Date(problem.endTime).toISOString().slice(0, 16);
      form.score = problem.score || undefined;
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    // 验证时间
    const startDate = new Date(form.startTime);
    const endDate = new Date(form.endTime);

    if (startDate >= endDate) {
      push.error("结束时间必须晚于开始时间");
      return;
    }

    // 验证分数
    if (form.score !== undefined && (isNaN(form.score) || form.score < 1)) {
      push.error("分数必须是正整数");
      return;
    }

    const updateData = await $fetch(`/api/problems/${problemId}`, {
      method: "PUT",
      body: {
        title: form.title,
        shortDescription: form.shortDescription,
        detailedDescription: form.detailedDescription,
        datasetUrl: form.datasetUrl || undefined,
        judgingScriptUrl: form.judgingScriptUrl || undefined,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        score: form.score ? parseInt(String(form.score)) : undefined,
      },
    });

    if (updateData.success) {
      push.success("题目更新成功！");

      // 刷新数据缓存
      await refresh();

      // 2秒后跳转到题目管理页面
      setTimeout(() => {
        navigateTo("/admin/problems");
      }, 2000);
    }
  } catch (err: any) {
    push.error(err.data?.message || err.message || "更新题目失败");
  } finally {
    isSubmitting.value = false;
  }
};
</script>
