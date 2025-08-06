<template>
  <div class="md:hidden">
    <!-- 汉堡包图标按钮 -->
    <button
      @click="toggleMenu"
      class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
      aria-expanded="false"
      aria-label="打开主菜单"
    >
      <span class="sr-only">打开主菜单</span>
      <!-- 汉堡包图标（菜单关闭时显示） -->
      <svg
        v-show="!isOpen"
        class="block h-6 w-6"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
      <!-- X 图标（菜单打开时显示） -->
      <svg
        v-show="isOpen"
        class="block h-6 w-6"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>

    <!-- 移动端菜单覆盖层 -->
    <Transition
      enter-active-class="transition-opacity ease-linear duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity ease-linear duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-show="isOpen"
        class="fixed inset-0 z-40 bg-black bg-opacity-25"
        @click="closeMenu"
      ></div>
    </Transition>

    <!-- 移动端侧边栏菜单 -->
    <Transition
      enter-active-class="transition ease-in-out duration-300 transform"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition ease-in-out duration-300 transform"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <div
        v-show="isOpen"
        class="fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl overflow-y-auto"
      >
        <!-- 菜单头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">菜单</h2>
          <button
            @click="closeMenu"
            class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            aria-label="关闭菜单"
          >
            <span class="sr-only">关闭菜单</span>
            <svg
              class="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- 菜单内容 -->
        <nav class="px-4 py-4 space-y-1">
          <template v-for="item in navItems" :key="item.text">
            <!-- 处理有 action 的直接按钮项 -->
            <button
              v-if="item.action"
              @click="handleDirectAction(item)"
              :class="mobileButtonClass"
            >
              {{ item.text }}
            </button>
            <!-- 处理普通导航项 -->
            <NavLink
              v-else
              :item="item"
              :link-class="mobileLinkClass"
              :button-class="mobileButtonClass"
              :dropdown-class="mobileDropdownClass"
              :dropdown-item-class="mobileDropdownItemClass"
              :dropdown-button-class="mobileDropdownButtonClass"
              @click="handleNavClick"
              @child-action="handleChildAction"
            />
          </template>
        </nav>
      </div>
    </Transition>
  </div>
</template>

<script setup>
// 导入 NavLink 组件
import NavLink from "./NavLink.vue";

const props = defineProps({
  navItems: {
    type: Array,
    required: true,
    validator: (value) => {
      // 验证每个导航项的结构
      return value.every((item) => {
        if (!item.text) return false;
        // 直接链接需要 to 属性，或者有 children 数组
        return item.to || (item.children && Array.isArray(item.children));
      });
    },
  },
});

const emit = defineEmits(["navClick", "childAction"]);

// 菜单状态管理
const isOpen = ref(false);

// 切换菜单显示状态
const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

// 关闭菜单
const closeMenu = () => {
  isOpen.value = false;
};

// 处理导航链接点击
const handleNavClick = () => {
  closeMenu();
  emit("navClick");
};

// 处理子项动作（如退出登录）
const handleChildAction = (child) => {
  closeMenu();
  emit("childAction", child);
};

// 处理直接动作项
const handleDirectAction = (item) => {
  closeMenu();
  emit("childAction", item);
};

// 移动端样式类
const mobileLinkClass =
  "block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-150";

const mobileButtonClass =
  "block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-150";

const mobileDropdownClass =
  "mt-2 ml-4 space-y-1 bg-gray-50 rounded-lg border-l-4 border-indigo-300 pl-4 py-2";

const mobileDropdownItemClass =
  "block px-4 py-2 text-sm text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors duration-150 whitespace-nowrap";

const mobileDropdownButtonClass =
  "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors duration-150 whitespace-nowrap";

// 监听 ESC 键关闭菜单
const handleKeydown = (event) => {
  if (event.key === "Escape" && isOpen.value) {
    closeMenu();
  }
};

// 组件挂载时添加键盘事件监听
onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

// 组件卸载时移除键盘事件监听
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});

// 监听路由变化，自动关闭菜单
const route = useRoute();
watch(route, () => {
  closeMenu();
});
</script>
