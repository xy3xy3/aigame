<template>
  <div class="max-w-4xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">编辑比赛</h1>
      <p class="mt-2 text-gray-600">修改比赛信息</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 编辑表单 -->
    <form v-else-if="data?.competition" @submit.prevent="handleSubmit" class="space-y-6">
      <!-- 基本信息 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>

        <div class="grid grid-cols-1 gap-6">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
              比赛标题 *
            </label>
            <input
              id="title"
              v-model="form.title"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="输入比赛标题"
            />
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
              比赛描述
            </label>
            <textarea
              id="description"
              v-model="form.description"
              rows="4"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="输入比赛描述"
            ></textarea>
          </div>

          <div>
            <label for="rules" class="block text-sm font-medium text-gray-700 mb-1">
              比赛规则
            </label>
            <textarea
              id="rules"
              v-model="form.rules"
              rows="6"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="输入比赛规则"
            ></textarea>
          </div>

          <div>
            <label for="banner" class="block text-sm font-medium text-gray-700 mb-1">
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
                  id="banner"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleBannerUpload"
                />
                <label
                  for="banner"
                  class="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  上传新图片
                </label>
                <p v-if="uploading" class="mt-1 text-sm text-gray-500">上传中...</p>
                <p v-if="uploadError" class="mt-1 text-sm text-red-600">
                  {{ uploadError }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 时间设置 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">时间设置</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="startTime" class="block text-sm font-medium text-gray-700 mb-1">
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
            <label for="endTime" class="block text-sm font-medium text-gray-700 mb-1">
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
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-end space-x-4">
        <NuxtLink
          to="/admin/competitions"
          class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium"
        >
          取消
        </NuxtLink>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
        >
          {{ isSubmitting ? "更新中..." : "更新比赛" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const competitionId = route.params.id;

// 获取比赛数据
const { data, pending, error, refresh } = await useFetch(
  `/api/competitions/${competitionId}`
);

const form = reactive({
  title: "",
  description: "",
  rules: "",
  bannerUrl: "",
  startTime: "",
  endTime: "",
});

const isSubmitting = ref(false);
const bannerPreview = ref("");
const uploading = ref(false);
const uploadError = ref("");

const handleBannerUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  bannerPreview.value = URL.createObjectURL(file);
  uploading.value = true;
  uploadError.value = "";

  const formData = new FormData();
  formData.append("banner", file);

  try {
    const result = await $fetch("/api/competitions/banner/upload", {
      method: "POST",
      body: formData,
    });
    form.bannerUrl = result.url;
  } catch (err) {
    uploadError.value = err.data?.message || "上传失败";
    // 如果上传失败，恢复到原始图片
    bannerPreview.value = data.value?.competition?.bannerUrl || "";
  } finally {
    uploading.value = false;
  }
};

// 当数据加载完成后，填充表单
watch(
  data,
  (newData) => {
    if (newData?.competition) {
      const competition = newData.competition;
      form.title = competition.title;
      form.description = competition.description;
      form.rules = competition.rules;
      form.bannerUrl = competition.bannerUrl || "";
      if (competition.bannerUrl) {
        bannerPreview.value = competition.bannerUrl;
      }

      // 转换时间格式为 datetime-local 输入框需要的格式
      form.startTime = new Date(competition.startTime).toISOString().slice(0, 16);
      form.endTime = new Date(competition.endTime).toISOString().slice(0, 16);
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

    const updateData = await $fetch(`/api/competitions/${competitionId}`, {
      method: "PUT",
      body: {
        title: form.title,
        description: form.description,
        rules: form.rules,
        bannerUrl: form.bannerUrl || undefined,
        startTime: convertLocalToUTC(form.startTime),
        endTime: convertLocalToUTC(form.endTime),
      },
    });

    if (updateData.success) {
      push.success("比赛更新成功！");

      // 刷新数据缓存
      await refresh();

      // 3秒后跳转到比赛管理页面
      setTimeout(() => {
        navigateTo("/admin/competitions");
      }, 2000);
    }
  } catch (error) {
    console.error("更新比赛失败:", error);
    push.error(error.data?.message || error.message || "更新失败，请重试");
  } finally {
    isSubmitting.value = false;
  }
};

import { convertLocalToUTC } from "~/composables/useDateUtils";
</script>
