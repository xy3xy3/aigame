<template>
  <div class="md:hidden">
    <!-- 汉堡包图标按钮 -->
    <UButton
      @click="toggleMenu"
      variant="ghost"
      color="gray"
      icon="i-heroicons-bars-3-20-solid"
      aria-label="打开主菜单"
      class="p-2 text-gray-800 hover:text-gray-900 hover:bg-gray-100"
    />

    <!-- 移动端侧边栏菜单 - 只在打开时渲染 -->
    <Teleport to="body" v-if="isOpen">
      <div class="fixed inset-0 z-50 md:hidden">
        <!-- 背景遮罩 -->
        <div
          class="fixed inset-0 bg-gray-900/20 backdrop-blur-sm"
          @click="closeMenu"
        ></div>

        <!-- 侧边栏内容 -->
        <div
          class="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-out"
          :class="isAnimating ? 'translate-x-0' : '-translate-x-full'"
        >
          <!-- 头部 -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <div class="flex items-center space-x-3">
              <div
                class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-squares-2x2-16-solid"
                  class="w-4 h-4 text-white"
                />
              </div>
              <h3 class="text-lg font-bold text-gray-900">导航菜单</h3>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeMenu"
            />
          </div>

          <!-- 菜单内容 -->
          <div class="flex-1 overflow-y-auto p-4">
            <nav class="space-y-2">
              <template v-for="item in navItems" :key="item.text">
                <!-- 处理有 action 的直接按钮项 -->
                <UButton
                  v-if="item.action"
                  @click="handleDirectAction(item)"
                  variant="ghost"
                  color="gray"
                  class="w-full justify-start mobile-nav-button group"
                  size="sm"
                  :ui="{ rounded: 'rounded-lg' }"
                >
                  {{ item.text }}
                </UButton>

                <!-- 处理有子菜单的项目 -->
                <div v-else-if="item.children" class="space-y-2">
                  <UButton
                    @click="toggleSubmenu(item.text)"
                    variant="ghost"
                    color="gray"
                    class="w-full justify-start mobile-nav-button group"
                    size="sm"
                    :ui="{ rounded: 'rounded-lg' }"
                  >
                    <template #leading>
                      <UIcon
                        :name="
                          expandedSubmenus[item.text]
                            ? 'i-heroicons-chevron-down-16-solid'
                            : 'i-heroicons-chevron-right-16-solid'
                        "
                        class="w-4 h-4 transition-transform"
                      />
                    </template>
                    {{ item.text }}
                  </UButton>
                  <div
                    v-show="expandedSubmenus[item.text]"
                    class="mobile-nav-submenu space-y-1"
                  >
                    <template
                      v-for="child in item.children"
                      :key="child.to || child.text"
                    >
                      <UButton
                        v-if="child.to"
                        :to="child.to"
                        @click="handleNavClick"
                        variant="ghost"
                        color="gray"
                        class="w-full justify-start mobile-nav-button group"
                        size="sm"
                        :ui="{ rounded: 'rounded-lg' }"
                      >
                        {{ child.text }}
                      </UButton>
                      <UButton
                        v-else-if="child.action"
                        @click="handleChildAction(child)"
                        variant="ghost"
                        color="gray"
                        class="w-full justify-start mobile-nav-button group"
                        size="sm"
                        :ui="{ rounded: 'rounded-lg' }"
                      >
                        {{ child.text }}
                      </UButton>
                    </template>
                  </div>
                </div>

                <!-- 处理普通导航项 -->
                <UButton
                  v-else
                  :to="item.to"
                  @click="handleNavClick"
                  variant="ghost"
                  color="gray"
                  class="w-full justify-start mobile-nav-button group"
                  size="sm"
                  :ui="{ rounded: 'rounded-lg' }"
                >
                  {{ item.text }}
                </UButton>
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
  });
};

// 关闭菜单
const closeMenu = () => {
  isAnimating.value = false;
  setTimeout(() => {
    isOpen.value = false;
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

// 监听 ESC 键关闭菜单
const handleKeydown = (e) => {
  if (e.key === "Escape" && isOpen.value) {
    closeMenu();
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>
