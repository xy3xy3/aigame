<template>
  <div class="md:hidden">
    <!-- 汉堡包图标按钮 -->
    <UButton
      @click="isOpen = true"
      variant="ghost"
      color="gray"
      icon="i-heroicons-bars-3-20-solid"
      aria-label="打开主菜单"
      class="p-2"
    />

    <!-- 移动端侧边栏菜单 -->
    <USlideover v-model="isOpen" side="left">
      <UCard
        class="flex flex-col flex-1"
        :ui="{ ring: '', divide: 'divide-y divide-gray-200 dark:divide-gray-800' }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              菜单
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="isOpen = false"
            />
          </div>
        </template>

        <!-- 菜单内容 -->
        <div class="flex-1 overflow-y-auto">
          <nav class="space-y-1">
            <template v-for="item in navItems" :key="item.text">
              <!-- 处理有 action 的直接按钮项 -->
              <UButton
                v-if="item.action"
                @click="handleDirectAction(item)"
                variant="ghost"
                color="gray"
                class="w-full justify-start"
                size="sm"
              >
                {{ item.text }}
              </UButton>

              <!-- 处理有子菜单的项目 -->
              <div v-else-if="item.children" class="space-y-1">
                <div class="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                  {{ item.text }}
                </div>
                <div class="ml-4 space-y-1">
                  <template v-for="child in item.children" :key="child.to || child.text">
                    <UButton
                      v-if="child.to"
                      :to="child.to"
                      @click="handleNavClick"
                      variant="ghost"
                      color="gray"
                      class="w-full justify-start"
                      size="sm"
                    >
                      {{ child.text }}
                    </UButton>
                    <UButton
                      v-else-if="child.action"
                      @click="handleChildAction(child)"
                      variant="ghost"
                      color="gray"
                      class="w-full justify-start"
                      size="sm"
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
                class="w-full justify-start"
                size="sm"
              >
                {{ item.text }}
              </UButton>
            </template>
          </nav>
        </div>
      </UCard>
    </USlideover>
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

// 处理导航链接点击
const handleNavClick = () => {
  isOpen.value = false;
  emit("navClick");
};

// 处理子项动作（如退出登录）
const handleChildAction = (child) => {
  isOpen.value = false;
  emit("childAction", child);
};

// 处理直接动作项
const handleDirectAction = (item) => {
  isOpen.value = false;
  emit("childAction", item);
};

// 监听路由变化，自动关闭菜单
const route = useRoute();
watch(route, () => {
  isOpen.value = false;
});
</script>
