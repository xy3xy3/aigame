<template>
  <div class="md:hidden">
    <!-- 汉堡包图标按钮 -->
    <button
      @click="toggleMenu"
      :aria-expanded="isOpen"
      :aria-controls="`mobile-nav-${navId}`"
      aria-label="打开主菜单"
      class="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>

    <!-- 移动端侧边栏菜单 - 只在打开时渲染 -->
    <Teleport to="body" v-if="isOpen">
      <div
        class="fixed inset-0 z-50 md:hidden"
        role="dialog"
        :aria-labelledby="`mobile-nav-title-${navId}`"
      >
        <!-- 背景遮罩 -->
        <div
          class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300"
          :class="{ 'opacity-100': isAnimating, 'opacity-0': !isAnimating }"
          @click="closeMenu"
          aria-hidden="true"
        ></div>

        <!-- 侧边栏内容 -->
        <div
          :id="`mobile-nav-${navId}`"
          class="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col"
          :class="isAnimating ? 'translate-x-0' : '-translate-x-full'"
        >
          <!-- 头部 -->
          <div
            class="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0"
          >
            <div class="flex items-center space-x-3">
              <div
                class="w-8 h-8 bg-gradient-to-br from-primary to-primary-focus rounded-lg flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <h3
                :id="`mobile-nav-title-${navId}`"
                class="text-lg font-bold text-gray-900"
              >
                导航菜单
              </h3>
            </div>
            <button
              @click="closeMenu"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="关闭菜单"
            >
              <svg
                class="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
          <div class="flex-1 overflow-y-auto p-4" style="max-height: calc(100vh - 80px)">
            <nav class="space-y-2">
              <template v-for="item in navItems" :key="item.text">
                <!-- 处理有 action 的直接按钮项 -->
                <button
                  v-if="item.action"
                  @click="handleDirectAction(item)"
                  class="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {{ item.text }}
                </button>

                <!-- 处理有子菜单的项目 -->
                <div v-else-if="item.children" class="space-y-2">
                  <button
                    @click="toggleSubmenu(item.text)"
                    :aria-expanded="expandedSubmenus[item.text]"
                    :aria-controls="`submenu-${item.text.replace(/\s+/g, '-')}`"
                    class="w-full flex items-center justify-start px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    :class="
                      isAdminSectionActive(item)
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    "
                  >
                    <svg
                      class="w-4 h-4 mr-2 transition-transform duration-200"
                      :class="{ 'rotate-90': expandedSubmenus[item.text] }"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    {{ item.text }}
                  </button>
                  <div
                    v-show="expandedSubmenus[item.text]"
                    :id="`submenu-${item.text.replace(/\s+/g, '-')}`"
                    class="ml-4 space-y-1 border-l-2 border-gray-200 pl-4"
                  >
                    <template
                      v-for="child in item.children"
                      :key="child.to || child.text"
                    >
                      <NuxtLink
                        v-if="child.to"
                        :to="child.to"
                        @click="handleNavClick"
                        class="block px-3 py-2 text-sm rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        :class="
                          isActiveRoute(child.to)
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        "
                      >
                        {{ child.text }}
                      </NuxtLink>
                      <button
                        v-else-if="child.action"
                        @click="handleChildAction(child)"
                        class="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {{ child.text }}
                      </button>
                    </template>
                  </div>
                </div>

                <!-- 处理普通导航项 -->
                <NuxtLink
                  v-else
                  :to="item.to"
                  @click="handleNavClick"
                  class="block px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {{ item.text }}
                </NuxtLink>
              </template>
            </nav>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const props = defineProps({
  navItems: {
    type: Array,
    required: true,
    validator: (value) => {
      // 验证每个导航项的结构
      return value.every((item) => {
        if (!item.text) return false;
        // 直接链接需要 to 属性，或者有 children 数组，或者有 action
        return item.to || item.action || (item.children && Array.isArray(item.children));
      });
    },
  },
});

const emit = defineEmits(["navClick", "childAction"]);

// 菜单状态管理
const isOpen = ref(false);
const isAnimating = ref(false);
const expandedSubmenus = ref({});
const navId = ref(`nav-${Math.random().toString(36).substr(2, 9)}`);

// 切换子菜单展开状态
const toggleSubmenu = (itemText) => {
  expandedSubmenus.value[itemText] = !expandedSubmenus.value[itemText];
};

// 切换菜单显示状态
const toggleMenu = () => {
  if (isOpen.value) {
    closeMenu();
  } else {
    openMenu();
  }
};

// 打开菜单
const openMenu = () => {
  isOpen.value = true;
  nextTick(() => {
    isAnimating.value = true;
    // 焦点管理 - 将焦点移到菜单内容
    const menuContent = document.getElementById(`mobile-nav-${navId.value}`);
    if (menuContent) {
      const firstFocusable = menuContent.querySelector(
        'button, a, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  });
};

// 关闭菜单
const closeMenu = () => {
  isAnimating.value = false;
  setTimeout(() => {
    isOpen.value = false;
    // 将焦点返回到触发按钮
    const trigger = document.querySelector(`[aria-controls="mobile-nav-${navId.value}"]`);
    if (trigger) {
      trigger.focus();
    }
  }, 300);
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

// 监听路由变化，自动关闭菜单
const route = useRoute();
watch(route, () => {
  closeMenu();
});

// 路由激活状态判断
const isActiveRoute = (path) => {
  if (!path) return false;
  if (path === "/") {
    return route.path === "/";
  }
  return route.path.startsWith(path);
};

// 判断管理后台区域是否激活
const isAdminSectionActive = (item) => {
  if (!item.children) return false;
  // 检查当前路由是否匹配任何管理后台子项
  return item.children.some((child) => child.to && route.path.startsWith(child.to));
};

// 监听 ESC 键关闭菜单
const handleKeydown = (e) => {
  if (e.key === "Escape" && isOpen.value) {
    closeMenu();
  }
};

// 焦点陷阱 - 简化版本
const handleFocusTrap = (e) => {
  if (!isOpen.value) return;

  if (e.key === "Tab") {
    const menuContent = document.getElementById(`mobile-nav-${navId.value}`);
    if (!menuContent) return;

    const focusableElements = menuContent.querySelectorAll(
      'button, a, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("keydown", handleFocusTrap);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("keydown", handleFocusTrap);
});
</script>
