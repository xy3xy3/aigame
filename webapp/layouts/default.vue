<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <NuxtLink to="/" class="text-xl font-bold text-gray-900">
                AI竞赛平台
              </NuxtLink>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NuxtLink
                to="/competitions"
                class="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                比赛
              </NuxtLink>
              <NuxtLink
                v-if="isLoggedIn"
                to="/teams"
                class="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                我的队伍
              </NuxtLink>
              <NuxtLink
                v-if="isLoggedIn"
                to="/submissions"
                class="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
              >
                我的提交
              </NuxtLink>
              <div
                v-if="isLoggedIn && user?.role === 'admin'"
                class="relative inline-flex items-center"
                ref="adminDropdownRef"
              >
                <button
                  @click="toggleAdminDropdown"
                  class="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  style="
                    background: none;
                    border: none;
                    padding: 0;
                    margin: 0;
                    font: inherit;
                    cursor: pointer;
                    outline: none;
                  "
                >
                  <span class="inline-flex items-center px-1 pt-1">
                    管理后台
                    <svg
                      class="w-4 h-4 ml-1 transition-transform duration-200"
                      :class="{ 'rotate-180': showAdminDropdown }"
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
                <!-- 下拉菜单 -->
                <Transition
                  enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
                >
                  <div
                    v-show="showAdminDropdown"
                    class="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                  >
                    <NuxtLink
                      to="/admin/dashboard"
                      @click="closeAdminDropdown"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      管理仪表板
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/competitions"
                      @click="closeAdminDropdown"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      管理比赛
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/problems"
                      @click="closeAdminDropdown"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      管理题目
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/users"
                      @click="closeAdminDropdown"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      管理用户
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/teams"
                      @click="closeAdminDropdown"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      管理队伍
                    </NuxtLink>
                    <NuxtLink
                      to="/admin/submissions"
                      @click="closeAdminDropdown"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      提交管理
                    </NuxtLink>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <template v-if="isLoggedIn">
              <div class="relative" ref="profileDropdownRef">
                <button
                  @click="toggleProfileDropdown"
                  class="flex items-center text-sm text-gray-700 focus:outline-none"
                >
                  <span>欢迎, {{ user?.username }}</span>
                  <svg
                    class="w-4 h-4 ml-1 transition-transform duration-200"
                    :class="{ 'rotate-180': showProfileDropdown }"
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
                </button>
                <Transition
                  enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
                >
                  <div
                    v-show="showProfileDropdown"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                  >
                    <NuxtLink
                      to="/profile"
                      @click="closeProfileDropdown"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >个人资料</NuxtLink
                    >
                    <NuxtLink
                      to="/profile/password"
                      @click="closeProfileDropdown"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >修改密码</NuxtLink
                    >
                    <button
                      @click="handleLogout"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      退出
                    </button>
                  </div>
                </Transition>
              </div>
            </template>
            <template v-else>
              <NuxtLink
                to="/login"
                class="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                登录
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                注册
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
// 使用认证状态管理
const { user, isLoggedIn, logout, fetchUser } = useCustomAuth();

// 控制下拉菜单显示/隐藏
const showAdminDropdown = ref(false);
const adminDropdownRef = ref(null);
const showProfileDropdown = ref(false);
const profileDropdownRef = ref(null);

// 在组件挂载时获取用户信息
onMounted(async () => {
  if (!user.value) {
    await fetchUser();
  }

  // 添加点击外部区域关闭下拉菜单的事件监听
  document.addEventListener("click", handleClickOutside);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

const handleLogout = async () => {
  await logout();
};

const toggleAdminDropdown = () => {
  showAdminDropdown.value = !showAdminDropdown.value;
};

const closeAdminDropdown = () => {
  showAdminDropdown.value = false;
};

const toggleProfileDropdown = () => {
  showProfileDropdown.value = !showProfileDropdown.value;
};

const closeProfileDropdown = () => {
  showProfileDropdown.value = false;
};

// 点击外部区域关闭下拉菜单
const handleClickOutside = (event) => {
  if (adminDropdownRef.value && !adminDropdownRef.value.contains(event.target)) {
    showAdminDropdown.value = false;
  }
  if (profileDropdownRef.value && !profileDropdownRef.value.contains(event.target)) {
    showProfileDropdown.value = false;
  }
};
</script>
