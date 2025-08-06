<template>
  <div class="relative">
    <!-- 单个链接 -->
    <NuxtLink
      v-if="!to && !href && !children"
      :to="to || href"
      :class="linkClasses"
      :aria-current="isActive ? 'page' : undefined"
      @click="handleClick"
    >
      <slot name="icon" />
      <span>{{ label }}</span>
      <slot name="badge" />
    </NuxtLink>

    <!-- 有子菜单的下拉导航 -->
    <div v-else-if="children && children.length" class="relative group">
      <button
        :class="linkClasses"
        :aria-expanded="isDropdownOpen"
        :aria-controls="`dropdown-${dropdownId}`"
        @click="toggleDropdown"
        @keydown.enter="toggleDropdown"
        @keydown.space.prevent="toggleDropdown"
        @keydown.escape="closeDropdown"
        @keydown.arrow-down.prevent="focusFirstChild"
      >
        <slot name="icon" />
        <span>{{ label }}</span>
        <svg
          class="ml-1 h-4 w-4 transition-transform duration-200"
          :class="{ 'rotate-180': isDropdownOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
        <slot name="badge" />
      </button>

      <!-- 下拉菜单 -->
      <div
        v-show="isDropdownOpen"
        :id="`dropdown-${dropdownId}`"
        class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
        role="menu"
        :aria-labelledby="`dropdown-${dropdownId}`"
      >
        <div class="py-1">
          <template
            v-for="(child, index) in children"
            :key="child.to || child.href || index"
          >
            <NuxtLink
              v-if="child.to || child.href"
              :to="child.to || child.href"
              class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
              role="menuitem"
              :tabindex="isDropdownOpen ? 0 : -1"
              @click="closeDropdown"
            >
              {{ child.label || child.text }}
            </NuxtLink>
            <button
              v-else-if="child.action"
              class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
              role="menuitem"
              :tabindex="isDropdownOpen ? 0 : -1"
              @click="handleChildAction(child)"
            >
              {{ child.label || child.text }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- 普通链接 -->
    <NuxtLink
      v-else
      :to="to || href"
      :class="linkClasses"
      :aria-current="isActive ? 'page' : undefined"
      @click="handleClick"
    >
      <slot name="icon" />
      <span>{{ label }}</span>
      <slot name="badge" />
    </NuxtLink>
  </div>
</template>

<script setup>
const props = defineProps({
  // 链接目标
  to: {
    type: String,
    default: null,
  },
  href: {
    type: String,
    default: null,
  },
  // 显示文本
  label: {
    type: String,
    required: true,
  },
  // 子菜单项
  children: {
    type: Array,
    default: () => [],
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false,
  },
  // 精确匹配
  exact: {
    type: Boolean,
    default: false,
  },
  // 前缀匹配
  matchPrefix: {
    type: Boolean,
    default: false,
  },
  // 自定义样式类
  class: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["click", "childAction"]);

// 路由状态
const route = useRoute();

// 下拉菜单状态
const isDropdownOpen = ref(false);
const dropdownId = ref(`nav-${Math.random().toString(36).substr(2, 9)}`);

// 计算激活状态
const isActive = computed(() => {
  if (!props.to && !props.href) return false;

  const targetPath = props.to || props.href;
  const currentPath = route.path;

  if (props.exact) {
    return currentPath === targetPath;
  }

  if (props.matchPrefix) {
    return currentPath.startsWith(targetPath);
  }

  // 默认使用前缀匹配，但排除根路径
  if (targetPath === "/") {
    return currentPath === "/";
  }

  return currentPath.startsWith(targetPath);
});

// 链接样式类
const linkClasses = computed(() => {
  const baseClasses = [
    "inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  ];

  if (props.disabled) {
    baseClasses.push("text-gray-400 dark:text-gray-500 cursor-not-allowed");
  } else if (isActive.value) {
    baseClasses.push("text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20");
  } else {
    baseClasses.push(
      "text-gray-700 dark:text-gray-200",
      "hover:text-gray-900 dark:hover:text-white",
      "hover:bg-gray-100 dark:hover:bg-gray-700"
    );
  }

  if (props.class) {
    baseClasses.push(props.class);
  }

  return baseClasses.join(" ");
});

// 下拉菜单控制
const toggleDropdown = () => {
  if (props.disabled) return;
  isDropdownOpen.value = !isDropdownOpen.value;
};

const closeDropdown = () => {
  isDropdownOpen.value = false;
};

const focusFirstChild = () => {
  if (!isDropdownOpen.value) {
    toggleDropdown();
  }
  nextTick(() => {
    const firstChild = document.querySelector(
      `#dropdown-${dropdownId.value} [role="menuitem"]`
    );
    if (firstChild) {
      firstChild.focus();
    }
  });
};

// 事件处理
const handleClick = (event) => {
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  emit("click", event);
};

const handleChildAction = (child) => {
  closeDropdown();
  emit("childAction", child);
};

// 点击外部关闭下拉菜单
onMounted(() => {
  const handleClickOutside = (event) => {
    if (isDropdownOpen.value) {
      const dropdown = document.getElementById(`dropdown-${dropdownId.value}`);
      if (
        dropdown &&
        !dropdown.contains(event.target) &&
        !event.target.closest(`[aria-controls="dropdown-${dropdownId.value}"]`)
      ) {
        closeDropdown();
      }
    }
  };

  document.addEventListener("click", handleClickOutside);

  onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
  });
});

// 监听路由变化关闭下拉菜单
watch(route, () => {
  closeDropdown();
});
</script>
