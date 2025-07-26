<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div v-if="pending" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载用户信息失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.user">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">个人资料</h1>
      </div>

      <!-- User Profile Card -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-4">
            <!-- User Avatar -->
            <div class="flex-shrink-0">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="data.user.username"
                class="w-16 h-16 rounded-full object-cover"
              />
              <div
                v-else
                class="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center"
              >
                <span class="text-indigo-600 font-bold text-xl">
                  {{ data.user.username.charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">{{ data.user.username }}</h2>
              <p class="mt-1 text-gray-600">{{ data.user.email }}</p>
            </div>
          </div>
          <button
            v-if="!isEditing"
            @click="startEditing"
            class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            编辑资料
          </button>
        </div>
      </div>

      <!-- Profile Information -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">基本信息</h2>
        </div>

        <!-- Display Mode -->
        <div v-if="!isEditing">
          <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">用户名</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ data.user.username }}</dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">邮箱</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ data.user.email }}</dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">手机号</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ data.user.phoneNumber || "未设置" }}
              </dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">学号</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ data.user.studentId || "未设置" }}
              </dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">真实姓名</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ data.user.realName || "未设置" }}
              </dd>
            </div>
            <div class="sm:col-span-1">
              <dt class="text-sm font-medium text-gray-500">学历</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ getEducationLabel(data.user.education) || "未设置" }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Edit Mode -->
        <div v-else class="space-y-4">
          <div class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div class="sm:col-span-1">
              <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                id="username"
                v-model="editForm.username"
                type="text"
                maxlength="50"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div class="sm:col-span-1">
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                id="email"
                v-model="editForm.email"
                type="email"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div class="sm:col-span-1">
              <label
                for="phoneNumber"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                手机号
              </label>
              <input
                id="phoneNumber"
                v-model="editForm.phoneNumber"
                type="text"
                maxlength="20"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div class="sm:col-span-1">
              <label for="studentId" class="block text-sm font-medium text-gray-700 mb-1">
                学号
              </label>
              <input
                id="studentId"
                v-model="editForm.studentId"
                type="text"
                maxlength="50"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div class="sm:col-span-1">
              <label for="realName" class="block text-sm font-medium text-gray-700 mb-1">
                真实姓名
              </label>
              <input
                id="realName"
                v-model="editForm.realName"
                type="text"
                maxlength="50"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div class="sm:col-span-1">
              <label for="education" class="block text-sm font-medium text-gray-700 mb-1">
                学历
              </label>
              <select
                id="education"
                v-model="editForm.education"
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">请选择学历</option>
                <option value="BACHELOR">本科</option>
                <option value="MASTER">硕士</option>
                <option value="DOCTORATE">博士</option>
              </select>
            </div>
          </div>

          <!-- Avatar Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"> 头像 </label>
            <div class="flex items-center space-x-4">
              <div v-if="avatarPreview || avatarUrl" class="flex-shrink-0">
                <img
                  :src="avatarPreview || avatarUrl"
                  alt="头像预览"
                  class="w-16 h-16 rounded-full object-cover"
                />
              </div>
              <div class="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleAvatarSelect"
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
              @click="updateProfile"
              :disabled="isUpdating"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {{ isUpdating ? "更新中..." : "更新资料" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Teams Section -->
      <div v-if="teamsData" class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">我的队伍</h2>

        <!-- Created Teams -->
        <div
          v-if="teamsData.createdTeams && teamsData.createdTeams.length > 0"
          class="mb-6"
        >
          <h3 class="text-lg font-medium text-gray-800 mb-3">我创建的队伍</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="team in teamsData.createdTeams"
              :key="team.id"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex items-center space-x-3">
                <div v-if="team.avatarUrl" class="flex-shrink-0">
                  <img
                    :src="team.avatarUrl"
                    :alt="team.name"
                    class="w-10 h-10 rounded-full object-cover"
                  />
                </div>
                <div v-else class="flex-shrink-0">
                  <div
                    class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center"
                  >
                    <span class="text-indigo-600 font-medium text-sm">
                      {{ team.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <NuxtLink
                      :to="`/teams/${team.id}`"
                      class="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate"
                    >
                      {{ team.name }}
                    </NuxtLink>
                    <p class="text-xs text-gray-500 truncate">
                      {{ team.members.length }} 名成员
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Joined Teams -->
        <div v-if="teamsData.joinedTeams && teamsData.joinedTeams.length > 0">
          <h3 class="text-lg font-medium text-gray-800 mb-3">我加入的队伍</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="team in teamsData.joinedTeams"
              :key="team.id"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex items-center space-x-3">
                <div v-if="team.avatarUrl" class="flex-shrink-0">
                  <img
                    :src="team.avatarUrl"
                    :alt="team.name"
                    class="w-10 h-10 rounded-full object-cover"
                  />
                </div>
                <div v-else class="flex-shrink-0">
                  <div
                    class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center"
                  >
                    <span class="text-indigo-600 font-medium text-sm">
                      {{ team.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <NuxtLink
                    :to="`/teams/${team.id}`"
                    class="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate"
                  >
                    {{ team.name }}
                  </NuxtLink>
                  <p class="text-xs text-gray-500 truncate">
                    队长: {{ team.captain.username }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Teams Message -->
        <div
          v-if="
            (!teamsData.createdTeams || teamsData.createdTeams.length === 0) &&
            (!teamsData.joinedTeams || teamsData.joinedTeams.length === 0)
          "
          class="text-center py-4"
        >
          <p class="text-gray-500">您还没有创建或加入任何队伍</p>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">用户信息不存在</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "auth",
});

const { user } = useAuth();

// 编辑状态
const isEditing = ref(false);
const isUpdating = ref(false);
const updateError = ref("");
const updateSuccess = ref("");

// 头像相关
const avatarFile = ref(null);
const avatarPreview = ref(null);

// 编辑表单
const editForm = reactive({
  username: "",
  email: "",
  phoneNumber: "",
  studentId: "",
  realName: "",
  education: "",
});

// 获取用户信息
const { data, pending, error, refresh } = await useFetch("/api/auth/me");

// 获取用户团队信息
const { data: teamsData } = await useFetch("/api/users/profile/teams");

// 计算属性：头像URL
const avatarUrl = computed(() => {
  if (data.value?.user?.avatarUrl) {
    // 如果后端已经处理过URL，直接返回
    return data.value.user.avatarUrl;
  }
  return null;
});

// 开始编辑
const startEditing = () => {
  // 初始化表单数据
  editForm.username = data.value.user.username;
  editForm.email = data.value.user.email;
  editForm.phoneNumber = data.value.user.phoneNumber || "";
  editForm.studentId = data.value.user.studentId || "";
  editForm.realName = data.value.user.realName || "";
  editForm.education = data.value.user.education || "";

  // 清除状态
  avatarFile.value = null;
  avatarPreview.value = null;
  updateError.value = "";
  updateSuccess.value = "";
  isEditing.value = true;
};

// 取消编辑
const cancelEditing = () => {
  isEditing.value = false;
  avatarFile.value = null;
  avatarPreview.value = null;
  updateError.value = "";
  updateSuccess.value = "";
};

// 处理头像选择
const handleAvatarSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    avatarFile.value = file;
    // 创建预览URL
    avatarPreview.value = URL.createObjectURL(file);
  }
};

// 更新用户资料
const updateProfile = async () => {
  isUpdating.value = true;
  updateError.value = "";
  updateSuccess.value = "";

  try {
    const formData = new FormData();

    // 添加所有字段到表单数据
    if (editForm.username !== data.value.user.username) {
      formData.append("username", editForm.username);
    }
    if (editForm.email !== data.value.user.email) {
      formData.append("email", editForm.email);
    }
    if (editForm.phoneNumber !== (data.value.user.phoneNumber || "")) {
      formData.append("phoneNumber", editForm.phoneNumber);
    }
    if (editForm.studentId !== (data.value.user.studentId || "")) {
      formData.append("studentId", editForm.studentId);
    }
    if (editForm.realName !== (data.value.user.realName || "")) {
      formData.append("realName", editForm.realName);
    }
    if (editForm.education !== (data.value.user.education || "")) {
      formData.append("education", editForm.education);
    }

    // 添加头像文件（如果已选择）
    if (avatarFile.value) {
      formData.append("avatar", avatarFile.value);
    }

    // 如果没有要更新的内容，直接返回
    if (![...formData.entries()].length) {
      isUpdating.value = false;
      cancelEditing();
      return;
    }

    const response = await $fetch("/api/auth/update", {
      method: "PUT",
      body: formData,
    });

    // 更新成功后刷新用户数据
    await refresh();

    updateSuccess.value = "资料更新成功";

    // 延迟关闭编辑模式，让用户看到成功消息
    setTimeout(() => {
      isEditing.value = false;
      avatarFile.value = null;
      avatarPreview.value = null;
    }, 1500);
  } catch (err) {
    updateError.value = err.data?.message || err.statusMessage || "更新失败";
  } finally {
    isUpdating.value = false;
  }
};

// 获取学历标签
const getEducationLabel = (education) => {
  switch (education) {
    case "BACHELOR":
      return "本科";
    case "MASTER":
      return "硕士";
    case "DOCTORATE":
      return "博士";
    default:
      return "";
  }
};
</script>
