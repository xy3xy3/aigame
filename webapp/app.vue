<template>
  <UApp>
    <Notivue v-slot="item">
      <Notification :item="item" />
    </Notivue>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup>
// 初始化认证状态
const { fetchUser } = useCustomAuth();
// 在应用启动时尝试获取用户信息
onMounted(async () => {
  try {
    await fetchUser();
  } catch (error) {
    // 忽略认证错误，用户可能未登录
    console.log("用户未登录或认证失败");
  }
});
</script>
