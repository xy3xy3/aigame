<template>
  <div class="max-w-4xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">创建比赛</h1>
      <p class="mt-2 text-gray-600">设置新的AI竞赛</p>
    </div>

    <form
      @submit.prevent="handleSubmit"
      class="bg-white rounded-lg shadow-md p-6 space-y-6"
    >
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
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
        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
          比赛描述 *
        </label>
        <textarea
          id="description"
          v-model="form.description"
          rows="4"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="详细描述比赛内容和目标"
        ></textarea>
      </div>

      <div>
        <label for="rules" class="block text-sm font-medium text-gray-700 mb-2">
          比赛规则 *
        </label>
        <textarea
          id="rules"
          v-model="form.rules"
          rows="6"
          required
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="详细说明比赛规则、评分标准等"
        ></textarea>
      </div>

      <div>
        <label for="banner" class="block text-sm font-medium text-gray-700 mb-2">
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
              上传图片
            </label>
            <p v-if="uploading" class="mt-1 text-sm text-gray-500">上传中...</p>
            <p v-if="uploadError" class="mt-1 text-sm text-red-600">{{ uploadError }}</p>
          </div>
        </div>
      </div>

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
          {{ isSubmitting ? "创建中..." : "创建比赛" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "auth",
});

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
    const data = await $fetch("/api/competitions/banner/upload", {
      method: "POST",
      body: formData,
    });
    form.bannerUrl = data.url;
  } catch (err) {
    uploadError.value = err.data?.message || "上传失败";
    bannerPreview.value = ""; // 清除预览
  } finally {
    uploading.value = false;
  }
};

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

    const data = await $fetch("/api/competitions", {
      method: "POST",
      body: {
        title: form.title,
        description: form.description,
        rules: form.rules,
        bannerUrl: form.bannerUrl || undefined,
        startTime: convertLocalToUTC(form.startTime),
        endTime: convertLocalToUTC(form.endTime),
      },
    });

    if (data.success) {
      push.success("比赛创建成功！");
      // 重置表单
      Object.keys(form).forEach((key) => {
        form[key] = "";
      });

      // 3秒后跳转到比赛列表
      setTimeout(() => {
        navigateTo("/admin/competitions");
      }, 3000);
    }
  } catch (err) {
    push.error(err.data?.message || err.message || "创建比赛失败");
  } finally {
    isSubmitting.value = false;
  }
};

// 设置默认时间（当前时间+1小时作为开始时间，+25小时作为结束时间）
onMounted(() => {
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000); // +1小时
  const end = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25小时

  form.startTime = start.toISOString().slice(0, 16);
  form.endTime = end.toISOString().slice(0, 16);
});

import { convertLocalToUTC } from "~/composables/useDateUtils";
</script>
