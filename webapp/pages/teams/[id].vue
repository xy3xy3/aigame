<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载队伍信息失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.team">
      <div class="mb-6">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-4">
            <!-- Team Avatar -->
            <div class="flex-shrink-0">
              <img
                v-if="data.team.avatarUrl"
                :src="getAvatarUrl(data.team.avatarUrl)"
                :alt="data.team.name"
                class="w-16 h-16 rounded-full object-cover"
              />
              <div
                v-else
                class="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center"
              >
                <span class="text-indigo-600 font-bold text-xl">
                  {{ data.team.name.charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">{{ data.team.name }}</h1>
              <p class="mt-2 text-gray-600">队长: {{ data.team.captain.username }}</p>
            </div>
          </div>
          <div>
            <span
              v-if="data.team.isLocked"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
            >
              队伍已锁定
            </span>
          </div>
        </div>
      </div>

      <!-- Team Description -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">队伍介绍</h2>
          <button
            v-if="isCaptain && !isEditing"
            @click="startEditing"
            class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            编辑
          </button>
        </div>

        <!-- Display Mode -->
        <div v-if="!isEditing">
          <p v-if="teamDescription" class="text-gray-700 whitespace-pre-wrap">
            {{ teamDescription }}
          </p>
          <p v-else class="text-gray-500 italic">暂无队伍介绍</p>
        </div>

        <!-- Edit Mode -->
        <div v-else class="space-y-4">
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
              队伍介绍
            </label>
            <textarea
              id="description"
              v-model="newDescription"
              rows="4"
              maxlength="500"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="请输入队伍介绍..."
            ></textarea>
            <div class="text-right text-sm text-gray-500 mt-1">
              {{ newDescription.length }}/500
            </div>
          </div>

          <!-- Avatar Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"> 队伍头像 </label>
            <div class="flex items-center space-x-4">
              <div v-if="avatarFile" class="flex-shrink-0">
                <img
                  :src="URL.createObjectURL(avatarFile)"
                  alt="预览"
                  class="w-16 h-16 rounded-full object-cover"
                />
              </div>
              <div class="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleFileSelect"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p class="text-xs text-gray-500 mt-1">
                  支持 JPG, PNG, GIF, WebP 格式，最大 5MB
                </p>
              </div>
            </div>
          </div>

          <!-- Update Form Messages -->
          <div v-if="updateError" class="text-red-600 text-sm">
            {{ updateError }}
          </div>
          <div v-if="updateSuccess" class="text-green-600 text-sm">
            {{ updateSuccess }}
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end space-x-3">
            <button
              @click="cancelEditing"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              @click="updateTeamInfo"
              :disabled="isUpdating"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {{ isUpdating ? "更新中..." : "更新信息" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Team Members -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">队伍成员</h2>
        <div class="space-y-3">
          <div
            v-for="member in data.team.members"
            :key="member.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-md"
          >
            <div class="flex items-center space-x-3">
              <div
                class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center"
              >
                <span class="text-indigo-600 font-medium">
                  {{ member.user.username.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ member.user.username }}</p>
                <p class="text-sm text-gray-600">{{ member.user.email }}</p>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <span
                v-if="member.user.id === data.team.captainId"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
              >
                队长
              </span>

              <button
                v-if="
                  isCaptain &&
                  member.user.id !== data.team.captainId &&
                  !data.team.isLocked
                "
                @click="handleRemoveMember(member.user.id)"
                class="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                移除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Invite Members (Captain Only) -->
      <div v-if="isCaptain && !data.team.isLocked" class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">邀请成员</h2>
        <form @submit.prevent="inviteMember" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              成员邮箱
            </label>
            <input
              id="email"
              v-model="inviteEmail"
              type="email"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="输入要邀请成员的邮箱"
            />
          </div>
          <div v-if="inviteError" class="text-red-600 text-sm">
            {{ inviteError }}
          </div>
          <div v-if="inviteSuccess" class="text-green-600 text-sm">
            {{ inviteSuccess }}
          </div>
          <button
            type="submit"
            :disabled="isInviting"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {{ isInviting ? "邀请中..." : "发送邀请" }}
          </button>
        </form>

        <!-- Generated Invitation Link -->
        <div v-if="generatedInvitationLink" class="mt-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            邀请链接已生成
          </label>
          <div class="flex space-x-2">
            <input
              type="text"
              readonly
              :value="generatedInvitationLink"
              class="flex-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              @click="copyToClipboard"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              复制
            </button>
          </div>
          <p v-if="copySuccess" class="text-green-600 text-sm mt-2">
            链接已复制到剪贴板！
          </p>
        </div>
      </div>
    </div>

    <!-- Team Actions -->
    <div
      v-if="isCaptain || isMember"
      class="bg-white shadow rounded-lg p-6 mt-6 border-t border-gray-200"
    >
      <h3 class="text-lg font-medium leading-6 text-gray-900">危险区域</h3>
      <div class="mt-2 max-w-xl text-sm text-gray-500">
        <p>请谨慎操作，以下行为不可逆。</p>
      </div>
      <div class="mt-5">
        <!-- Leave Team Button (Member only) -->
        <button
          v-if="isMember"
          @click="handleLeaveTeam"
          type="button"
          class="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
        >
          退出队伍
        </button>
        <!-- Disband Team Button (Captain only) -->
        <button
          v-if="isCaptain"
          @click="handleDisbandTeam"
          type="button"
          class="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
        >
          解散队伍
        </button>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">队伍不存在</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();
const { user } = useAuth();

// 获取头像公共URL (现在由后端处理，直接返回处理过的URL)
const getAvatarUrl = (avatarUrl) => {
  return avatarUrl || "";
};

const teamId = route.params.id;
const inviteEmail = ref("");
const isInviting = ref(false);
const inviteError = ref("");
const inviteSuccess = ref("");
const generatedInvitationLink = ref("");
const copySuccess = ref(false);

// 编辑团队信息相关状态
const isEditing = ref(false);
const teamDescription = ref("");
const newDescription = ref("");
const avatarFile = ref(null);
const isUpdating = ref(false);
const updateError = ref("");
const updateSuccess = ref("");

const { data, pending, error, refresh } = await useFetch(`/api/teams/${teamId}`);

// 当数据加载完成后，初始化团队描述
watch(
  data,
  (newData) => {
    if (newData?.team?.description) {
      teamDescription.value = newData.team.description;
    }
  },
  { immediate: true }
);

const isCaptain = computed(() => {
  return data.value?.team?.captainId === user.value?.id;
});

const isMember = computed(() => {
  if (!user.value || !data.value?.team) {
    return false;
  }
  const isTeamMember = data.value.team.members.some((m) => m.user.id === user.value.id);
  return isTeamMember && !isCaptain.value;
});

const inviteMember = async () => {
  if (!inviteEmail.value.trim()) return;

  isInviting.value = true;
  inviteError.value = "";
  inviteSuccess.value = "";

  try {
    const response = await $fetch(`/api/teams/${teamId}/invite`, {
      method: "POST",
      body: { email: inviteEmail.value.trim() },
    });

    inviteSuccess.value = "邀请已发送！";
    inviteEmail.value = "";

    // 生成邀请链接
    if (response && response.id) {
      const baseUrl = window.location.origin;
      generatedInvitationLink.value = `${baseUrl}/invitations/${response.id}`;
    }

    await refresh();
  } catch (err) {
    inviteError.value = err.data?.message || err.statusMessage || "邀请失败";
  } finally {
    isInviting.value = false;
  }
};

const handleRemoveMember = async (userId) => {
  if (!window.confirm("您确定要移除该成员吗？此操作不可逆。")) {
    return;
  }

  try {
    await $fetch(`/api/teams/${teamId}/remove`, {
      method: "DELETE",
      body: { userId },
    });
    await refresh();
  } catch (err) {
    push.error(`移除成员失败: ${err.data?.message || err.statusMessage || "未知错误"}`);
  }
};

const handleLeaveTeam = async () => {
  if (!window.confirm("您确定要退出该队伍吗？")) {
    return;
  }

  try {
    await $fetch(`/api/teams/${teamId}/leave`, {
      method: "POST",
    });
    await router.push("/teams");
  } catch (err) {
    push.error(`退出队伍失败: ${err.data?.message || err.statusMessage || "未知错误"}`);
  }
};

const handleDisbandTeam = async () => {
  if (!window.confirm("您确定要解散该队伍吗？此操作将永久删除队伍且不可恢复。")) {
    return;
  }

  try {
    await $fetch(`/api/teams/${teamId}`, {
      method: "DELETE",
    });
    await router.push("/teams");
  } catch (err) {
    push.error(`解散队伍失败: ${err.data?.message || err.statusMessage || "未知错误"}`);
  }
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generatedInvitationLink.value);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (err) {
    console.error("无法复制链接: ", err);
    push.error("复制链接失败");
  }
};
// 开始编辑团队信息
const startEditing = () => {
  newDescription.value = teamDescription.value;
  isEditing.value = true;
  updateError.value = "";
  updateSuccess.value = "";
};

// 取消编辑
const cancelEditing = () => {
  isEditing.value = false;
  newDescription.value = teamDescription.value;
  avatarFile.value = null;
  updateError.value = "";
  updateSuccess.value = "";
};

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    avatarFile.value = file;
  }
};

// 更新团队信息
const updateTeamInfo = async () => {
  isUpdating.value = true;
  updateError.value = "";
  updateSuccess.value = "";

  try {
    const formData = new FormData();

    // 添加描述（如果已更改）
    if (newDescription.value !== teamDescription.value) {
      formData.append("description", newDescription.value);
    }

    // 添加头像文件（如果已选择）
    if (avatarFile.value) {
      formData.append("avatar", avatarFile.value);
    }

    // 如果没有要更新的内容，直接返回
    if (!formData.has("description") && !formData.has("avatar")) {
      isUpdating.value = false;
      return;
    }

    const response = await $fetch(`/api/teams/${teamId}`, {
      method: "PUT",
      body: formData,
    });

    // 更新成功后刷新数据
    await refresh();

    // 更新本地状态
    if (response.team.description !== undefined) {
      teamDescription.value = response.team.description || "";
    }

    updateSuccess.value = "团队信息更新成功";
    isEditing.value = false;
    avatarFile.value = null;
  } catch (err) {
    updateError.value = err.data?.message || err.statusMessage || "更新失败";
  } finally {
    isUpdating.value = false;
  }
};
</script>
