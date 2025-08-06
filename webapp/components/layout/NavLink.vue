<template>
  <!-- 直接链接 -->
  <NuxtLink
    v-if="!item.children"
    :to="item.to"
    :class="linkClass"
    @click="$emit('click')"
  >
    {{ item.text }}
  </NuxtLink>

  <!-- 下拉菜单链接 -->
  <div v-else class="relative block w-full" :ref="dropdownRef">
    <button @click="toggleDropdown" :class="buttonClass" :style="buttonStyle">
      <span class="inline-flex items-center px-1 pt-1">
        {{ item.text }}
        <svg
          class="w-4 h-4 ml-1 transition-transform duration-200"
          :class="{ 'rotate-180': showDropdown }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </span>
    </button>

    <!-- 下拉菜单内容 -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div v-show="showDropdown" :class="dropdownClass">
        <template v-for="child in item.children" :key="child.to || child.text">
          <!-- 下拉菜单中的链接 -->
          <NuxtLink
            v-if="child.to"
            :to="child.to"
            @click="closeDropdown"
            :class="dropdownItemClass"
          >
            {{ child.text }}
          </NuxtLink>

          <!-- 下拉菜单中的按钮（如退出按钮） -->
          <button
            v-else-if="child.action"
            @click="handleChildAction(child)"
            :class="dropdownButtonClass"
          >
            {{ child.text }}
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true,
    validator: (value) => {
      // 验证 item 对象的结构
      if (!value.text) return false;

      // 直接链接需要 to 属性
      if (!value.children && !value.to) return false;

      // 下拉菜单需要 children 数组
      if (value.children && !Array.isArray(value.children)) return false;

      return true;
    },
  },
  // 直接链接的样式类
  linkClass: {
    type: String,
    default:
      "text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium",
  },
  // 下拉菜单按钮的样式类
  buttonClass: {
    type: String,
    default:
      "text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium",
  },
  // 下拉菜单按钮的内联样式
  buttonStyle: {
    type: Object,
    default: () => ({
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      font: "inherit",
      cursor: "pointer",
      outline: "none",
    }),
  },
  // 下拉菜单容器的样式类
  dropdownClass: {
    type: String,
    default:
      "absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200",
  },
  // 下拉菜单项的样式类
  dropdownItemClass: {
    type: String,
    default:
      "block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150",
  },
  // 下拉菜单按钮项的样式类
  dropdownButtonClass: {
    type: String,
    default: "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100",
  },
});

const emit = defineEmits(["click", "childAction"]);

// 下拉菜单状态管理
const showDropdown = ref(false);
const dropdownRef = ref(null);

// 切换下拉菜单显示状态
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

// 关闭下拉菜单
const closeDropdown = () => {
  showDropdown.value = false;
};

// 处理子项的动作（如退出登录）
const handleChildAction = (child) => {
  closeDropdown();
  emit("childAction", child);
};

// 点击外部区域关闭下拉菜单
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    showDropdown.value = false;
  }
};

// 组件挂载时添加事件监听
onMounted(() => {
  if (props.item.children) {
    document.addEventListener("click", handleClickOutside);
  }
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  if (props.item.children) {
    document.removeEventListener("click", handleClickOutside);
  }
});
</script>
