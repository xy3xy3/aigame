<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- 面包屑导航 -->
    <nav class="mb-4 text-sm">
      <ol class="flex items-center space-x-2 text-gray-500">
        <li>
          <NuxtLink to="/admin/dashboard" class="hover:text-blue-600">管理后台</NuxtLink>
        </li>
        <li class="flex items-center">
          <svg class="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
          </svg>
        </li>
        <li class="text-gray-900">评测节点</li>
      </ol>
    </nav>

    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">评测节点</h1>
          <p class="mt-2 text-gray-600">配置多个 evaluateapp 节点及回调</p>
        </div>
        <button @click="openCreate" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">新建节点</button>
      </div>
    </div>

    <!-- 加载/错误状态 -->
    <div v-if="pending" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">加载中...</p>
    </div>
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <p class="text-red-800">加载失败: {{ error.message }}</p>
    </div>

    <!-- 列表 -->
    <div v-else class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">评测地址</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">回调地址</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">启用</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">更新时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="node in nodes" :key="node.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ node.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ node.baseUrl }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ node.callbackUrl || '-' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span :class="node.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ node.active ? '启用' : '停用' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(node.updatedAt) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                <button @click="openEdit(node)" class="text-blue-600 hover:text-blue-900">编辑</button>
                <button @click="confirmDelete(node)" class="text-red-600 hover:text-red-800">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="nodes.length === 0" class="text-center py-12">
        <div class="text-gray-400 text-6xl mb-2">🧩</div>
        <div class="text-gray-600">暂无节点，请点击右上角“新建节点”。</div>
      </div>
    </div>

    <!-- 创建/编辑 模态框 -->
    <div v-if="showModal" class="fixed inset-0 overflow-y-auto z-50">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
          <div class="bg-white px-6 py-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">{{ editing ? '编辑节点' : '新建节点' }}</h3>
            <form @submit.prevent="saveNode" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input v-model="form.name" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="唯一名称，如 node-1" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">评测服务地址 (baseUrl) *</label>
                <input v-model="form.baseUrl" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="http://host:8000" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">回调基础地址 (callbackUrl)</label>
                <input v-model="form.callbackUrl" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="http://webapp-host:3000" />
                <p class="text-xs text-gray-500 mt-1">将会在节点侧拼接 /api/submissions/callback</p>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">上传密钥 (uploadSecret) *</label>
                  <input v-model="form.uploadSecret" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">回调密钥 (callbackSecret) *</label>
                  <input v-model="form.callbackSecret" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
              </div>
              <div class="flex items-center">
                <input id="node-active" v-model="form.active" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                <label for="node-active" class="ml-2 block text-sm text-gray-700">启用</label>
              </div>
            </form>
          </div>
          <div class="bg-gray-50 px-6 py-3 sm:flex sm:flex-row-reverse">
            <button @click="saveNode" :disabled="submitting" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 sm:ml-3 sm:w-auto text-sm disabled:opacity-50">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
            <button @click="closeModal" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto text-sm">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="showDelete" class="fixed inset-0 overflow-y-auto z-50">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
          <div class="bg-white px-6 py-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">删除节点</h3>
            <p class="text-gray-600">确定删除节点 “{{ selected?.name }}” 吗？该操作不可撤销。</p>
          </div>
          <div class="bg-gray-50 px-6 py-3 sm:flex sm:flex-row-reverse">
            <button @click="doDelete" :disabled="submitting" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-white hover:bg-red-700 sm:ml-3 sm:w-auto text-sm disabled:opacity-50">{{ submitting ? '删除中...' : '删除' }}</button>
            <button @click="closeDelete" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto text-sm">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: 'admin' })

const { data, pending, error, refresh } = await useFetch('/api/admin/evaluate-nodes')
const nodes = computed(() => data.value?.data || [])

const showModal = ref(false)
const showDelete = ref(false)
const submitting = ref(false)
const editing = ref(false)
const selected = ref(null)

const form = ref({
  id: '',
  name: '',
  baseUrl: '',
  uploadSecret: '',
  callbackSecret: '',
  callbackUrl: '',
  active: true,
})

function openCreate() {
  editing.value = false
  form.value = { id: '', name: '', baseUrl: '', uploadSecret: '', callbackSecret: '', callbackUrl: '', active: true }
  showModal.value = true
}

function openEdit(node) {
  editing.value = true
  selected.value = node
  form.value = { id: node.id, name: node.name, baseUrl: node.baseUrl, uploadSecret: node.uploadSecret, callbackSecret: node.callbackSecret, callbackUrl: node.callbackUrl || '', active: node.active }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function confirmDelete(node) {
  selected.value = node
  showDelete.value = true
}

function closeDelete() {
  showDelete.value = false
}

async function saveNode() {
  submitting.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/evaluate-nodes/${form.value.id}`, { method: 'PUT', body: { ...form.value } })
      push.success('已更新评测节点')
    } else {
      await $fetch('/api/admin/evaluate-nodes', { method: 'POST', body: { ...form.value } })
      push.success('已创建评测节点')
    }
    closeModal()
    await refresh()
  } catch (e) {
    push.error('保存失败：' + (e?.data?.message || e?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

async function doDelete() {
  submitting.value = true
  try {
    await $fetch(`/api/admin/evaluate-nodes/${selected.value.id}`, { method: 'DELETE' })
    push.success('已删除评测节点')
    closeDelete()
    await refresh()
  } catch (e) {
    push.error('删除失败：' + (e?.data?.message || e?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

function formatDate(input) {
  if (!input) return '-'
  return new Date(input).toLocaleString('zh-CN')
}
</script>

