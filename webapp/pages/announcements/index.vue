<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">公告列表</h1>
      <p class="mt-2 text-gray-600">查看所有发布的公告</p>
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

    <!-- 公告列表 -->
    <div v-else-if="data?.announcements" class="space-y-6">
      <div
        v-for="announcement in data.announcements"
        :key="announcement.id"
        class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
      >
        <div class="p-6">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold text-gray-900">{{ announcement.title }}</h2>
            <span class="text-sm text-gray-500">{{
              formatDate(announcement.createdAt)
            }}</span>
          </div>
          <div
            class="mt-4 prose max-w-none"
            v-html="renderMarkdown(announcement.content)"
          ></div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="data.announcements.length === 0" class="text-center py-12">
        <div class="text-gray-400 text-6xl mb-4">📢</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无公告</h3>
        <p class="text-gray-600">目前还没有发布公告。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { marked } from "marked";

definePageMeta({
  layout: "default",
});

const { data, pending, error, refresh } = await useFetch("/api/announcements");

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const renderMarkdown = (content) => {
  return marked.parse(content);
};
</script>

<style scoped>
.prose :deep(h1) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.prose :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
}

.prose :deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.prose :deep(p) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.prose :deep(ul),
.prose :deep(ol) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding-left: 1.5rem;
}

.prose :deep(li) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.prose :deep(a) {
  color: #4f46e5;
  text-decoration: underline;
}

.prose :deep(a:hover) {
  color: #4338ca;
}

.prose :deep(code) {
  background-color: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.prose :deep(pre) {
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.25rem;
  overflow-x: auto;
}

.prose :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.prose :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 1rem;
  margin-left: 0;
  margin-right: 0;
  color: #6b7280;
}
</style>
