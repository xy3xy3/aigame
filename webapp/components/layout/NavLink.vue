<template>
  <UNavigationMenu
    :items="navigationItems"
    orientation="horizontal"
    variant="link"
    :highlight="false"
    :class="navClass"
    :ui="{
      childList: 'grid grid-cols-2 gap-1 p-2',
      content: 'w-64 bg-white',
      viewport: 'bg-white',
    }"
  />
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
      if (!value.children && !value.to && !value.action) return false;

      // 下拉菜单需要 children 数组
      if (value.children && !Array.isArray(value.children)) return false;

      return true;
    },
  },
  // 导航菜单的样式类
  navClass: {
    type: String,
    default: "text-sm font-medium",
  },
});

const emit = defineEmits(["click", "childAction"]);

// 将当前数据结构转换为 NavigationMenu 兼容格式
const navigationItems = computed(() => {
  const convertItem = (item) => {
    const navItem = {
      label: item.text,
      to: item.to,
    };

    // 处理子菜单
    if (item.children && item.children.length > 0) {
      navItem.children = item.children.map((child) => ({
        label: child.text,
        to: child.to,
        onSelect: child.action
          ? (e) => {
              e.preventDefault();
              emit("childAction", child);
            }
          : undefined,
      }));
    }

    // 处理直接动作
    if (item.action) {
      navItem.onSelect = (e) => {
        e.preventDefault();
        emit("childAction", item);
      };
    }

    return navItem;
  };

  return [convertItem(props.item)];
});
</script>
