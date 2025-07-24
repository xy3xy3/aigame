<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">加载队伍信息失败: {{ error.message }}</p>
    </div>

    <div v-else-if="data?.team">
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ data.team.name }}</h1>
            <p class="mt-2 text-gray-600">队长: {{ data.team.captain.username }}</p>
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
              <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
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
                v-if="isCaptain && member.user.id !== data.team.captainId && !data.team.isLocked"
                @click="removeMember(member.user.id)"
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
            >
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
            {{ isInviting ? '邀请中...' : '发送邀请' }}
          </button>
        </form>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">队伍不存在</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const { user } = useAuth()

const teamId = route.params.id
const inviteEmail = ref('')
const isInviting = ref(false)
const inviteError = ref('')
const inviteSuccess = ref('')

const { data, pending, error, refresh } = await useFetch(`/api/teams/${teamId}`)

const isCaptain = computed(() => {
  return data.value?.team?.captainId === user.value?.id
})

const inviteMember = async () => {
  if (!inviteEmail.value.trim()) return
  
  isInviting.value = true
  inviteError.value = ''
  inviteSuccess.value = ''
  
  try {
    const response = await $fetch(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      body: { email: inviteEmail.value.trim() }
    })
    
    inviteSuccess.value = response.message
    inviteEmail.value = ''
    await refresh()
  } catch (err) {
    inviteError.value = err.data?.message || err.statusMessage || '邀请失败'
  } finally {
    isInviting.value = false
  }
}

const removeMember = async (userId) => {
  if (!confirm('确定要移除这个成员吗？')) return
  
  try {
    await $fetch(`/api/teams/${teamId}/remove`, {
      method: 'DELETE',
      body: { userId }
    })
    
    await refresh()
  } catch (err) {
    alert(err.data?.message || err.statusMessage || '移除成员失败')
  }
}
</script>