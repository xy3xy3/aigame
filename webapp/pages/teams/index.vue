<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">我的队伍</h1>
      <p class="mt-2 text-gray-600">管理您的队伍或创建新队伍</p>
    </div>

    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载队伍信息失败: {{ error.message }}</p>
    </div>

    <div v-else>
      <!-- Create Team Section -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">创建新队伍</h2>
        <form @submit.prevent="createTeam" class="space-y-4">
          <div>
            <label for="teamName" class="block text-sm font-medium text-gray-700">
              队伍名称
            </label>
            <input
              id="teamName"
              v-model="newTeamName"
              type="text"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入队伍名称"
            />
          </div>
          <div v-if="createError" class="text-red-600 text-sm">
            {{ createError }}
          </div>
          <button
            type="submit"
            :disabled="isCreating"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {{ isCreating ? "创建中..." : "创建队伍" }}
          </button>
        </form>
      </div>

      <!-- Existing Teams -->
      <div v-if="data?.teams?.length > 0">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">我的队伍</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="team in data.teams"
            :key="team.id"
            class="bg-white shadow rounded-lg p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <!-- Team Avatar -->
                <div class="flex-shrink-0">
                  <img
                    v-if="team.avatarUrl"
                    :src="getAvatarUrl(team.avatarUrl)"
                    :alt="team.name"
                    class="w-10 h-10 rounded-full object-cover"
                  />
                  <div
                    v-else
                    class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
                  >
                    <span class="text-blue-600 font-bold">
                      {{ team.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">{{ team.name }}</h3>
              </div>
              <span
                v-if="team.isLocked"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
              >
                已锁定
              </span>
            </div>

            <div class="mb-4">
              <p class="text-sm text-gray-600 mb-2">
                队长: {{ getCreatorUsername(team) }}
              </p>
              <p class="text-sm text-gray-600">成员数量: {{ team.members.length }}</p>
            </div>

            <div class="space-y-2">
              <NuxtLink
                :to="`/teams/${team.id}`"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block text-center"
              >
                查看详情
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-600">您还没有加入任何队伍</p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "auth",
});

const newTeamName = ref("");
const isCreating = ref(false);
const createError = ref("");

const { data, pending, error, refresh } = await useFetch("/api/teams");

// 获取头像公共URL
const getAvatarUrl = (avatarUrl) => {
  return avatarUrl || "";
};

// 获取队伍创建者的用户名
const getCreatorUsername = (team) => {
  if (!team || !team.members || !Array.isArray(team.members)) {
    return "未知";
  }

  const creator = team.members.find((member) => member.role === "CREATOR");
  return creator && creator.user ? creator.user.username : "未知";
};

const createTeam = async () => {
  if (!newTeamName.value.trim()) return;

  isCreating.value = true;
  createError.value = "";

  try {
    await $fetch("/api/teams", {
      method: "POST",
      body: { name: newTeamName.value.trim() },
    });

    newTeamName.value = "";
    await refresh();
  } catch (err) {
    createError.value = err.data?.message || err.statusMessage || "创建队伍失败";
  } finally {
    isCreating.value = false;
  }
};
</script>
