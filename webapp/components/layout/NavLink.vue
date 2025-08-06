<template>
  <!-- 直接链接 -->
  <UButton
    v-if="!item.children"
    :to="item.to"
    variant="ghost"
    color="gray"
    :class="linkClass"
    @click="$emit('click')"
  >
    {{ item.text }}
  </UButton>

  <!-- 下拉菜单链接 -->
  <UDropdown v-else :items="dropdownItems" :popper="{ placement: 'bottom-end' }">
    <UButton
      variant="ghost"
      color="gray"
      trailing-icon="i-heroicons-chevron-down-20-solid"
      :class="buttonClass"
    >
      {{ item.text }}
    </UButton>
  </UDropdown>
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
    default: "text-sm font-medium",
  },
  // 下拉菜单按钮的样式类
  buttonClass: {
    type: String,
    default: "text-sm font-medium",
  },
});

const emit = defineEmits(["click", "childAction"]);

// 转换子项为 UDropdown 需要的格式
const dropdownItems = computed(() => {
  if (!props.item.children) return [];

  return [
    props.item.children.map((child) => ({
      label: child.text,
      to: child.to,
      click: child.action ? () => handleChildAction(child) : undefined,
    })),
  ];
});

// 处理子项的动作（如退出登录）
const handleChildAction = (child) => {
  emit("childAction", child);
};
</script>
