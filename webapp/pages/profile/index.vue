<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 面包屑导航 -->
    <nav class="mb-4 text-sm">
      <ol class="flex items-center space-x-2 text-gray-500">
        <li>
          <NuxtLink to="/" class="hover:text-indigo-600">首页</NuxtLink>
        </li>
        <li class="flex items-center">
          <svg class="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </li>
        <li class="text-gray-900">个人资料</li>
      </ol>
    </nav>

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
            <div class="sm:col-span-2">
              <dt class="text-sm font-medium text-gray-500">账户验证状态</dt>
              <dd class="mt-1">
                <div class="flex items-center space-x-4">
                  <!-- 邮箱验证状态 -->
                  <div class="flex items-center space-x-2">
                    <div class="flex items-center">
                      <svg
                        :class="[
                          'w-5 h-5 mr-1',
                          data.user.emailVerifiedAt ? 'text-green-500' : 'text-gray-400',
                        ]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"
                        ></path>
                        <path
                          d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"
                        ></path>
                      </svg>
                      <span class="text-sm text-gray-700">邮箱验证</span>
                    </div>
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        data.user.emailVerifiedAt
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800',
                      ]"
                    >
                      {{ data.user.emailVerifiedAt ? "已验证" : "待验证" }}
                    </span>
                  </div>

                  <!-- 账户状态 -->
                  <div class="flex items-center space-x-2">
                    <div class="flex items-center">
                      <svg
                        :class="['w-5 h-5 mr-1', getAccountStatusColor(data.user.status)]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                      <span class="text-sm text-gray-700">账户状态</span>
                    </div>
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getAccountStatusBadgeClass(data.user.status),
                      ]"
                    >
                      {{ getAccountStatusLabel(data.user.status) }}
                    </span>
                  </div>
                </div>

                <!-- 未验证邮箱的提示信息 -->
                <div
                  v-if="!data.user.emailVerifiedAt"
                  class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md"
                >
                  <div class="flex items-start">
                    <svg
                      class="w-5 h-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                    <div class="flex-1">
                      <p class="text-sm text-yellow-800">
                        您的邮箱尚未验证，部分功能可能受限。
                        <button
                          @click="resendVerificationEmail"
                          :disabled="isResendingVerification"
                          class="font-medium underline hover:no-underline disabled:opacity-50"
                        >
                          {{ isResendingVerification ? "发送中..." : "重新发送验证邮件" }}
                        </button>
                      </p>
                      <div v-if="resendMessage" class="mt-1">
                        <p
                          :class="[
                            'text-sm',
                            resendMessage.includes('成功')
                              ? 'text-green-700'
                              : 'text-red-700',
                          ]"
                        >
                          {{ resendMessage }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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

// 邮箱验证相关
const isResendingVerification = ref(false);
const resendMessage = ref("");

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

// 获取账户状态标签
const getAccountStatusLabel = (status) => {
  switch (status) {
    case "PENDING":
      return "待激活";
    case "ACTIVE":
      return "正常";
    case "BANNED":
      return "已封禁";
    default:
      return "未知";
  }
};

// 获取账户状态图标颜色
const getAccountStatusColor = (status) => {
  switch (status) {
    case "PENDING":
      return "text-yellow-500";
    case "ACTIVE":
      return "text-green-500";
    case "BANNED":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
};

// 获取账户状态徽章样式
const getAccountStatusBadgeClass = (status) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "BANNED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// 重新发送验证邮件
const resendVerificationEmail = async () => {
  if (isResendingVerification.value) return;

  isResendingVerification.value = true;
  resendMessage.value = "";

  try {
    const response = await $fetch("/api/auth/resend-verification", {
      method: "POST",
      body: {
        email: data.value.user.email,
      },
    });

    resendMessage.value = "验证邮件已发送，请查收邮箱";

    // 3秒后清除消息
    setTimeout(() => {
      resendMessage.value = "";
    }, 3000);
  } catch (error) {
    resendMessage.value =
      error.data?.message || error.statusMessage || "发送失败，请稍后重试";

    // 5秒后清除错误消息
    setTimeout(() => {
      resendMessage.value = "";
    }, 5000);
  } finally {
    isResendingVerification.value = false;
  }
};
</script>
