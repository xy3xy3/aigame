<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">系统设置</h1>
      <p class="mt-2 text-gray-600">配置系统基本设置</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="pending" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 设置表单 -->
    <div v-else class="bg-white rounded-lg shadow-md p-6">
      <form @submit.prevent="saveSettings">
        <div class="space-y-6">
          <!-- 系统标题 -->
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
              系统标题
            </label>
            <input
              id="title"
              v-model="settings.title"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="请输入系统标题"
            />
          </div>

          <!-- 版权信息 -->
          <div>
            <label for="copyright" class="block text-sm font-medium text-gray-700 mb-2">
              版权信息
            </label>
            <textarea
              id="copyright"
              v-model="settings.copyright"
              rows="4"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="请输入版权信息"
            ></textarea>
          </div>

          <!-- 提交按钮 -->
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="resetForm"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              重置
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {{ isSaving ? "保存中..." : "保存设置" }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "admin",
});

// 导入 useSettings composable
const { fetchSettings: refreshGlobalSettings } = useSettings();

const settings = ref({
  title: "",
  copyright: "",
});

const originalSettings = ref({});
const isSaving = ref(false);
const pending = ref(true);
const error = ref(null);

// 获取设置数据
const fetchSettings = async () => {
  try {
    pending.value = true;
    error.value = null;
    const response = await $fetch("/api/admin/settings");
    if (response.success) {
      settings.value = {
        title: response.data.title || "",
        copyright: response.data.copyright || "",
      };
      // 保存原始数据用于重置
      originalSettings.value = { ...settings.value };
    }
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    error.value = err;
  } finally {
    pending.value = false;
  }
};

// 保存设置
const saveSettings = async () => {
  isSaving.value = true;
  try {
    await $fetch("/api/admin/settings", {
      method: "PUT",
      body: settings.value,
    });

    // 更新原始数据
    originalSettings.value = { ...settings.value };

    // 刷新全局设置状态
    await refreshGlobalSettings();

    // 显示成功提示
    push.success("设置保存成功！");
  } catch (err) {
    console.error("Failed to save settings:", err);
    push.error("保存设置失败: " + (err.data?.message || err.message));
  } finally {
    isSaving.value = false;
  }
};

// 重置表单
const resetForm = () => {
  settings.value = { ...originalSettings.value };
};

// 页面加载时获取设置数据
onMounted(() => {
  fetchSettings();
});
</script>
