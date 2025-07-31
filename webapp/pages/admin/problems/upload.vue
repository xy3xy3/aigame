<template>
  <div class="max-w-3xl mx-auto py-6 px-4">
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
        <li>
          <NuxtLink to="/admin/problems" class="hover:text-indigo-600">题目管理</NuxtLink>
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
        <li class="text-gray-900">批量上传</li>
      </ol>
    </nav>

    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">批量上传题目</h1>
      <p class="mt-2 text-gray-600">上传包含题目信息的 ZIP 压缩包</p>
    </div>

    <!-- 上传表单 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <form @submit.prevent="submitForm">
        <!-- 文件选择 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            选择题目压缩包 *
          </label>
          <div
            class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-md"
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
                    name="file-upload"
                    type="file"
                    class="sr-only"
                    accept=".zip"
                    multiple
                    ref="fileInputRef"
                    @change="handleFileSelect"
                  />
                </label>
                <p class="pl-1">或将文件拖拽到此处</p>
              </div>
              <p class="text-xs text-gray-500">支持 ZIP 格式，可多选</p>
            </div>
          </div>
          <!-- 已选择的文件列表 -->
          <div v-if="selectedFiles.length > 0" class="mt-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">已选择的文件:</h4>
            <ul class="border border-gray-200 rounded-md divide-y divide-gray-200">
              <li
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="pl-3 pr-4 py-3 flex items-center justify-between text-sm"
              >
                <div class="w-0 flex-1 flex items-center">
                  <svg
                    class="flex-shrink-0 h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="ml-2 flex-1 w-0 truncate">
                    {{ file.name }}
                  </span>
                </div>
                <div class="ml-4 flex-shrink-0">
                  <button
                    @click="removeFile(index)"
                    type="button"
                    class="font-medium text-red-600 hover:text-red-500"
                  >
                    移除
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- 比赛选择 -->
        <div class="mb-6">
          <label for="competition" class="block text-sm font-medium text-gray-700 mb-2">
            关联竞赛 *
          </label>
          <select
            id="competition"
            v-model="formData.competitionId"
            required
            :disabled="competitionsPending"
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
          <div v-if="competitionsPending" class="mt-2 text-sm text-gray-500">
            加载竞赛列表中...
          </div>
        </div>

        <!-- 模式选择 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2"> 上传模式 * </label>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <input
                id="mode-create"
                v-model="formData.mode"
                type="radio"
                name="mode"
                value="create"
                class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
              />
              <label
                for="mode-create"
                class="ml-3 block text-sm font-medium text-gray-700"
              >
                新增
              </label>
              <p class="mt-1 text-xs text-gray-500">
                只能创建新题目，如果题目已存在会报错
              </p>
            </div>
            <div>
              <input
                id="mode-overwrite"
                v-model="formData.mode"
                type="radio"
                name="mode"
                value="overwrite"
                class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
              />
              <label
                for="mode-overwrite"
                class="ml-3 block text-sm font-medium text-gray-700"
              >
                覆盖
              </label>
              <p class="mt-1 text-xs text-gray-500">
                如果题目已存在则更新，否则创建新题目
              </p>
            </div>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="flex justify-end">
          <NuxtLink
            to="/admin/problems"
            class="mr-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            返回题目列表
          </NuxtLink>
          <button
            type="submit"
            :disabled="isSubmitting || selectedFiles.length === 0"
            :class="{
              'bg-indigo-600 hover:bg-indigo-700':
                !isSubmitting && selectedFiles.length > 0,
              'bg-indigo-400 cursor-not-allowed':
                isSubmitting || selectedFiles.length === 0,
            }"
            class="text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {{
              isSubmitting
                ? "上传中..."
                : selectedFiles.length === 0
                ? "请选择文件"
                : "开始上传"
            }}
          </button>
        </div>
      </form>
    </div>

    <!-- 上传结果 -->
    <div v-if="uploadResults.length > 0" class="mt-6 bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">上传结果</h2>
      <div class="space-y-4">
        <div
          v-for="(result, index) in uploadResults"
          :key="index"
          :class="{
            'border-green-200 bg-green-50': result.success,
            'border-red-200 bg-red-50': !result.success,
          }"
          class="border rounded-md p-4"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg
                v-if="result.success"
                class="h-5 w-5 text-green-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <svg
                v-else
                class="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3
                :class="{
                  'text-green-800': result.success,
                  'text-red-800': !result.success,
                }"
                class="text-sm font-medium"
              >
                {{ result.fileName }}
              </h3>
              <div
                :class="{
                  'text-green-700': result.success,
                  'text-red-700': !result.success,
                }"
                class="mt-2 text-sm"
              >
                <p v-if="result.success">
                  题目 "{{ result.data?.title }}" 上传成功
                  <span v-if="result.data?.mode === 'created'">（已创建）</span>
                  <span v-else-if="result.data?.mode === 'updated'">（已更新）</span>
                </p>
                <p v-else>上传失败: {{ result.error }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";

interface Competition {
  id: string;
  title: string;
}

interface CompetitionsResponse {
  success: boolean;
  competitions: Competition[];
}

interface UploadResult {
  fileName: string;
  success: boolean;
  data?: {
    problemId: string;
    title: string;
    mode: "created" | "updated";
  };
  error?: string;
}

definePageMeta({
  middleware: "admin",
});

// 文件选择相关
const fileInputRef: Ref<HTMLInputElement | null> = ref(null);
const fileInput = ref("");
const selectedFiles = ref<File[]>([]);

// 表单数据
const formData = ref({
  competitionId: "",
  mode: "create", // 默认选择新增模式
});

// 上传状态
const isSubmitting = ref(false);
const uploadResults = ref<UploadResult[]>([]);

// 获取竞赛列表
const {
  data: competitionsData,
  pending: competitionsPending,
  error: competitionsError,
} = await useFetch<CompetitionsResponse>("/api/competitions/simple");

const competitions = computed(() => competitionsData.value?.competitions || []);

// 在竞赛列表加载完成后，检查查询参数并设置默认值
watch(
  competitionsData,
  (newCompetitionsData) => {
    if (
      newCompetitionsData &&
      newCompetitionsData.competitions &&
      newCompetitionsData.competitions.length > 0
    ) {
      // 获取路由查询参数
      const route = useRoute();
      const competitionIdFromQuery = route.query.competitionId as string;

      // 检查查询参数中的竞赛ID是否有效
      if (competitionIdFromQuery) {
        const isValidCompetition = newCompetitionsData.competitions.some(
          (competition) => competition.id === competitionIdFromQuery
        );

        if (isValidCompetition) {
          formData.value.competitionId = competitionIdFromQuery;
        }
      }
    }
  },
  { immediate: true }
);

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (files) {
    // 将 FileList 转换为数组并添加到已选择的文件列表中
    const newFiles = Array.from(files);
    selectedFiles.value = [...selectedFiles.value, ...newFiles];

    // 清空 input 值以便可以再次选择相同的文件
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  }
};

// 移除已选择的文件
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
};

// 提交表单
const submitForm = async () => {
  if (isSubmitting.value || selectedFiles.value.length === 0) {
    return;
  }

  isSubmitting.value = true;
  uploadResults.value = [];

  try {
    // 为每个文件创建上传请求
    const uploadPromises = selectedFiles.value.map(async (file) => {
      const formDataObj = new FormData();
      formDataObj.append("files", file);
      formDataObj.append("competitionId", formData.value.competitionId);
      formDataObj.append("mode", formData.value.mode);

      try {
        const response = await $fetch("/api/problems/upload", {
          method: "POST",
          body: formDataObj,
        });

        if (response.success) {
          // 由于后端API返回的是数组，我们需要处理每个结果
          return response.results.map((result: any) => ({
            fileName: file.name,
            success: true,
            data: {
              problemId: result.problemId,
              title: result.title,
              mode: result.mode,
            },
          }));
        } else {
          return [
            {
              fileName: file.name,
              success: false,
              error: "上传失败",
            },
          ];
        }
      } catch (error: any) {
        return [
          {
            fileName: file.name,
            success: false,
            error: error.data?.message || error.message || "未知错误",
          },
        ];
      }
    });

    // 等待所有上传完成
    const results = await Promise.all(uploadPromises);

    // 展平结果数组
    uploadResults.value = results.flat();

    // 显示成功消息
    if (uploadResults.value.every((result) => result.success)) {
      push.success("所有文件上传成功");
    } else {
      push.warning("部分文件上传失败，请查看详细信息");
    }
  } catch (error: any) {
    console.error("上传过程中出错:", error);
    push.error("上传过程中出错: " + (error.data?.message || error.message || "未知错误"));
  } finally {
    isSubmitting.value = false;
  }
};
</script>
