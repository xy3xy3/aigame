<template>
  <div class="min-h-screen bg-gray-50 layout-wrapper">
    <!-- 使用 Nuxt UI 的导航栏 -->
    <UContainer>
      <div class="bg-white shadow">
        <div class="flex justify-between h-16 px-4">
          <div class="flex items-center">
            <!-- Logo/品牌名 -->
            <UButton :to="'/'" variant="ghost" color="gray" class="text-xl font-bold">
              {{ settings.title || "AI竞赛平台" }}
            </UButton>

            <!-- 桌面端导航 -->
            <div class="hidden md:ml-6 md:flex md:space-x-2">
              <template v-for="item in desktopNavItems" :key="item.text">
                <NavLink :item="item" @child-action="handleChildAction" />
              </template>
            </div>
          </div>

          <!-- 桌面端右侧区域 -->
          <div class="hidden md:flex md:items-center md:space-x-4">
            <template v-if="isLoggedIn">
              <!-- 用户信息 -->
              <UBadge color="primary" variant="soft" size="sm">
                {{ user?.username || "用户" }}
              </UBadge>
              <NavLink :item="userDropdownItem" @child-action="handleChildAction" />
            </template>
            <template v-else>
              <UButton to="/login" variant="ghost" color="gray" size="sm"> 登录 </UButton>
              <UButton to="/register" color="primary" size="sm"> 注册 </UButton>
            </template>
          </div>

          <!-- 移动端导航 -->
          <div class="md:hidden flex items-center">
            <MobileNav :nav-items="mobileNavItems" @child-action="handleChildAction" />
          </div>
        </div>
      </div>
    </UContainer>

    <main class="main-content">
      <slot />
    </main>

    <!-- Footer -->
    <UContainer>
      <footer class="bg-white border-t border-gray-200 mt-auto">
        <div class="py-6">
          <div class="text-center text-sm text-gray-500">
            <div v-html="settings.copyright || '© 2024 AI竞赛平台 版权所有'" />
          </div>
        </div>
      </footer>
    </UContainer>
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex-grow: 1;
}
</style>

<script setup>
// 导入组件
import NavLink from "~/components/layout/NavLink.vue";
import MobileNav from "~/components/layout/MobileNav.vue";

// 使用认证状态管理
const { user, isLoggedIn, logout, fetchUser } = useCustomAuth();

// 使用 useSettings 获取全局设置数据
const { settings } = useSettings();

// 更新浏览器标签页标题
useHead({
  title: settings.value?.title || "AI竞赛平台",
});

// 在组件挂载时获取用户信息
onMounted(async () => {
  if (!user.value) {
    await fetchUser();
  }
});

const handleLogout = async () => {
  await logout();
};

// 处理子项动作（如退出登录）
const handleChildAction = (child) => {
  if (child.action === "logout") {
    handleLogout();
  }
};

// 管理员导航项
const adminNavItems = computed(() => [
  { text: "管理仪表板", to: "/admin/dashboard" },
  { text: "比赛管理", to: "/admin/competitions" },
  { text: "题目管理", to: "/admin/problems" },
  { text: "用户管理", to: "/admin/users" },
  { text: "队伍管理", to: "/admin/teams" },
  { text: "提交管理", to: "/admin/submissions" },
  { text: "题解管理", to: "/admin/solutions" },
  { text: "公告管理", to: "/admin/announcements" },
  { text: "系统设置", to: "/admin/settings" },
]);

// 用户下拉菜单项
const userDropdownItem = computed(() => ({
  text: `欢迎, ${user.value?.username}`,
  children: [
    { text: "个人资料", to: "/profile" },
    { text: "修改密码", to: "/profile/password" },
    { text: "退出", action: "logout" },
  ],
}));

// 桌面端导航项
const desktopNavItems = computed(() => {
  console.log(
    "Computing desktopNavItems, isLoggedIn:",
    isLoggedIn.value,
    "user:",
    user.value
  );

  const items = [{ text: "比赛", to: "/competitions" }];

  // 登录用户的导航项
  if (isLoggedIn.value) {
    items.push(
      { text: "我的队伍", to: "/teams" },
      { text: "我的提交", to: "/submissions" },
      { text: "公告", to: "/announcements" }
    );

    // 管理员导航项
    if (user.value?.role === "admin") {
      items.push({
        text: "管理后台",
        children: adminNavItems.value,
      });
    }
  }

  console.log("Desktop nav items:", items);
  return items;
});

// 移动端导航项（包含所有项目）
const mobileNavItems = computed(() => {
  const items = [{ text: "比赛", to: "/competitions" }];

  if (isLoggedIn.value) {
    // 登录用户的导航项
    items.push(
      { text: "我的队伍", to: "/teams" },
      { text: "我的提交", to: "/submissions" },
      { text: "公告", to: "/announcements" }
    );

    // 管理员导航项（在移动端展开显示）
    if (user.value?.role === "admin") {
      items.push({
        text: "管理后台",
        children: adminNavItems.value,
      });
    }

    // 用户相关项 - 将个人资料和密码修改作为独立项目，退出单独处理
    items.push(
      { text: "个人资料", to: "/profile" },
      { text: "修改密码", to: "/profile/password" },
      { text: "退出", action: "logout" }
    );
  } else {
    // 未登录用户的导航项
    items.push({ text: "登录", to: "/login" }, { text: "注册", to: "/register" });
  }

  return items;
});
</script>
