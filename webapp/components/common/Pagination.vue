<template>
  <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
    <!-- 每页显示数量选择器 -->
    <div class="flex items-center gap-2">
      <label for="items-per-page" class="text-sm text-gray-700"> 每页显示: </label>
      <select
        id="items-per-page"
        :value="itemsPerPage"
        @change="onItemsPerPageChange"
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="选择每页显示条目数"
      >
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    </div>

    <!-- 分页信息和控件 -->
    <div class="flex flex-col items-center gap-2 sm:flex-row">
      <!-- 分页信息 -->
      <div class="text-sm text-gray-700">
        共 {{ totalItems }} 条，第 {{ currentPage }} / {{ totalPages }} 页
      </div>

      <!-- 分页按钮 -->
      <div class="flex gap-1">
        <!-- 首页按钮 -->
        <button
          :disabled="currentPage === 1"
          @click="goToFirstPage"
          class="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50"
          :class="{
            'bg-gray-100 hover:bg-gray-200': currentPage !== 1,
            'cursor-not-allowed': currentPage === 1,
          }"
          aria-label="首页"
        >
          «
        </button>

        <!-- 上一页按钮 -->
        <button
          :disabled="currentPage === 1"
          @click="goToPreviousPage"
          class="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50"
          :class="{
            'bg-gray-100 hover:bg-gray-200': currentPage !== 1,
            'cursor-not-allowed': currentPage === 1,
          }"
          aria-label="上一页"
        >
          ‹
        </button>

        <!-- 页码按钮 -->
        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
          :class="{
            'bg-blue-500 text-white': page === currentPage,
            'border border-gray-300 bg-white hover:bg-gray-100': page !== currentPage,
          }"
          :aria-current="page === currentPage ? 'page' : undefined"
          :aria-label="`第 ${page} 页`"
        >
          {{ page }}
        </button>

        <!-- 下一页按钮 -->
        <button
          :disabled="currentPage === totalPages"
          @click="goToNextPage"
          class="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50"
          :class="{
            'bg-gray-100 hover:bg-gray-200': currentPage !== totalPages,
            'cursor-not-allowed': currentPage === totalPages,
          }"
          aria-label="下一页"
        >
          ›
        </button>

        <!-- 末页按钮 -->
        <button
          :disabled="currentPage === totalPages"
          @click="goToLastPage"
          class="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50"
          :class="{
            'bg-gray-100 hover:bg-gray-200': currentPage !== totalPages,
            'cursor-not-allowed': currentPage === totalPages,
          }"
          aria-label="末页"
        >
          »
        </button>
      </div>

      <!-- 跳转到指定页码 -->
      <div class="flex items-center gap-2">
        <label for="goto-page" class="text-sm text-gray-700"> 跳转到: </label>
        <input
          id="goto-page"
          type="number"
          min="1"
          :max="totalPages"
          :value="currentPage"
          @change="onGotoPageChange"
          class="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="输入页码跳转"
        />
        <button
          @click="goToPage(gotoPageInput)"
          class="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          :disabled="gotoPageInput < 1 || gotoPageInput > totalPages"
          aria-label="跳转"
        >
          跳转
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 定义Props
interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
});

// 定义Emits
const emit = defineEmits<{
  (e: "page-change", page: number): void;
  (e: "items-per-page-change", itemsPerPage: number): void;
}>();

// 跳转页码输入值
const gotoPageInput = ref(props.currentPage);

// 计算可见的页码按钮
const visiblePages = computed(() => {
  const pages: number[] = [];
  const delta = 2; // 当前页前后显示的页码数

  // 计算起始和结束页码
  let start = Math.max(1, props.currentPage - delta);
  let end = Math.min(props.totalPages, props.currentPage + delta);

  // 确保始终显示5个页码按钮（如果总页数足够）
  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(props.totalPages, start + 4);
    } else if (end === props.totalPages) {
      start = Math.max(1, end - 4);
    }
  }

  // 添加页码到数组
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
});

// 处理每页显示数量变化
const onItemsPerPageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const value = parseInt(target.value);
  emit("items-per-page-change", value);
};

// 处理跳转页码输入变化
const onGotoPageChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = parseInt(target.value);
  if (!isNaN(value)) {
    gotoPageInput.value = Math.max(1, Math.min(props.totalPages, value));
  }
};

// 跳转到指定页码
const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit("page-change", page);
  }
};

// 跳转到首页
const goToFirstPage = () => {
  if (props.currentPage !== 1) {
    emit("page-change", 1);
  }
};

// 跳转到上一页
const goToPreviousPage = () => {
  if (props.currentPage > 1) {
    emit("page-change", props.currentPage - 1);
  }
};

// 跳转到下一页
const goToNextPage = () => {
  if (props.currentPage < props.totalPages) {
    emit("page-change", props.currentPage + 1);
  }
};

// 跳转到末页
const goToLastPage = () => {
  if (props.currentPage !== props.totalPages) {
    emit("page-change", props.totalPages);
  }
};

// 监听当前页变化，重置跳转输入框
watch(
  () => props.currentPage,
  (newPage) => {
    gotoPageInput.value = newPage;
  }
);
</script>
