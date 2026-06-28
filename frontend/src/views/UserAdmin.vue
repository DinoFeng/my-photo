<template>
  <div class="user-admin-page">
    <div class="page-header">
      <h1>👥 用户管理</h1>
      <n-button type="primary" @click="showCreateDialog = true">
        <span style="margin-right: 4px">+</span> 新建用户
      </n-button>
    </div>

    <div class="info-card">
      <p>家庭成员通过"邀请码"登录系统。创建用户后，把邀请码发给对应成员即可。</p>
    </div>

    <div v-if="loading" class="loading-state">
      <n-spin size="large" />
      <p>加载中...</p>
    </div>

    <div v-else class="user-list">
      <div
        v-for="user in users"
        :key="user.id"
        class="user-card"
      >
        <div class="user-info">
          <div class="avatar">{{ user.avatarEmoji }}</div>
          <div class="details">
            <div class="name">
              {{ user.displayName }}
              <span v-if="user.isAdmin" class="admin-badge">管理员</span>
            </div>
            <div class="invite-code" v-if="user.inviteCode">
              <span class="label">邀请码：</span>
              <code>{{ user.inviteCode }}</code>
              <button class="copy-btn" @click="copyCode(user.inviteCode!)">复制</button>
            </div>
            <div v-else class="no-invite">管理员账户（使用密码登录）</div>
            <div class="status-row">
              <span class="status" :class="user.status">{{ user.status === 'active' ? '启用' : '已禁用' }}</span>
              <span class="date">创建于 {{ formatDate(user.createdAt) }}</span>
            </div>
          </div>
        </div>
        <div class="user-actions" v-if="!user.isAdmin">
          <n-button size="small" @click="showEditDialog(user)">编辑</n-button>
          <n-button size="small" @click="showRegenCode(user)">重新生成邀请码</n-button>
          <n-button size="small" type="error" @click="doDelete(user)">删除</n-button>
        </div>
        <div class="user-actions" v-else>
          <span class="muted">系统管理员</span>
        </div>
      </div>

      <div v-if="users.length === 0" class="empty-state">
        <p>还没有用户</p>
      </div>
    </div>

    <!-- 创建用户对话框 -->
    <n-modal v-model:show="showCreateDialog" preset="card" title="创建新用户" :style="{ width: '440px' }">
      <n-form :model="createForm" label-placement="top" style="margin-top: 12px">
        <n-form-item label="昵称">
          <n-input v-model:value="createForm.displayName" placeholder="如：妈妈、爷爷" />
        </n-form-item>
        <n-form-item label="头像表情">
          <div class="emoji-picker">
            <span
              v-for="emoji in emojiOptions"
              :key="emoji"
              :class="['emoji-option', { active: createForm.avatarEmoji === emoji }]"
              @click="createForm.avatarEmoji = emoji"
            >{{ emoji }}</span>
          </div>
        </n-form-item>
      </n-form>
      <p class="hint">创建后系统会自动生成邀请码，将邀请码发给用户即可登录。</p>
      <template #footer>
        <n-button @click="showCreateDialog = false">取消</n-button>
        <n-button type="primary" :loading="creating" :disabled="!createForm.displayName.trim()" @click="doCreate">
          创建
        </n-button>
      </template>
    </n-modal>

    <!-- 编辑用户对话框 -->
    <n-modal v-model:show="showEditDialogVisible" preset="card" title="编辑用户" :style="{ width: '440px' }">
      <n-form v-if="editingUser" :model="editForm" label-placement="top" style="margin-top: 12px">
        <n-form-item label="昵称">
          <n-input v-model:value="editForm.displayName" />
        </n-form-item>
        <n-form-item label="头像表情">
          <div class="emoji-picker">
            <span
              v-for="emoji in emojiOptions"
              :key="emoji"
              :class="['emoji-option', { active: editForm.avatarEmoji === emoji }]"
              @click="editForm.avatarEmoji = emoji"
            >{{ emoji }}</span>
          </div>
        </n-form-item>
        <n-form-item label="状态">
          <n-radio-group v-model:value="editForm.status">
            <n-radio value="active">启用</n-radio>
            <n-radio value="disabled">禁用</n-radio>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-button @click="showEditDialogVisible = false">取消</n-button>
        <n-button type="primary" :loading="editing" @click="doEdit">保存</n-button>
      </template>
    </n-modal>

    <!-- 重新生成邀请码确认 -->
    <n-modal v-model:show="showRegenDialog" preset="card" title="重新生成邀请码" :style="{ width: '440px' }">
      <p v-if="editingUser">
        确定要为 <strong>{{ editingUser.displayName }}</strong> 重新生成邀请码吗？
        旧的邀请码将立即失效。
      </p>
      <template #footer>
        <n-button @click="showRegenDialog = false">取消</n-button>
        <n-button type="primary" :loading="regenerating" @click="doRegenCode">生成新邀请码</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { userApi, UserData } from '../utils/apiClient'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const users = ref<UserData[]>([])
const loading = ref(true)

const showCreateDialog = ref(false)
const showEditDialogVisible = ref(false)
const showRegenDialog = ref(false)
const creating = ref(false)
const editing = ref(false)
const regenerating = ref(false)

const emojiOptions = ['👨', '👩', '👦', '👧', '👴', '👵', '🧑', '👤', '🐱', '🐶', '🌸', '⭐']

const createForm = reactive({
  displayName: '',
  avatarEmoji: '👤',
})

const editingUser = ref<UserData | null>(null)
const editForm = reactive({
  displayName: '',
  avatarEmoji: '👤',
  status: 'active',
})

async function loadUsers() {
  loading.value = true
  try {
    const result = await userApi.getAll()
    users.value = result.users || []
  } catch (err: any) {
    message.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function showEditDialog(user: UserData) {
  editingUser.value = user
  editForm.displayName = user.displayName
  editForm.avatarEmoji = user.avatarEmoji
  editForm.status = user.status
  showEditDialogVisible.value = true
}

function showRegenCode(user: UserData) {
  editingUser.value = user
  showRegenDialog.value = true
}

async function doCreate() {
  if (!createForm.displayName.trim()) return
  creating.value = true
  try {
    const result = await userApi.create({
      displayName: createForm.displayName.trim(),
      avatarEmoji: createForm.avatarEmoji,
    })
    message.success('用户创建成功')
    showCreateDialog.value = false
    createForm.displayName = ''
    createForm.avatarEmoji = '👤'
    if (result.user) {
      message.info(`邀请码: ${result.user.inviteCode}`)
    }
    await loadUsers()
  } catch (err: any) {
    message.error(err.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function doEdit() {
  if (!editingUser.value) return
  editing.value = true
  try {
    await userApi.update(editingUser.value.id, {
      displayName: editForm.displayName.trim(),
      avatarEmoji: editForm.avatarEmoji,
      status: editForm.status,
    })
    message.success('已更新')
    showEditDialogVisible.value = false
    await loadUsers()
  } catch (err: any) {
    message.error(err.message || '更新失败')
  } finally {
    editing.value = false
  }
}

async function doRegenCode() {
  if (!editingUser.value) return
  regenerating.value = true
  try {
    const result = await userApi.update(editingUser.value.id, {
      regenerateInviteCode: true,
    })
    message.success(`新邀请码: ${result.user.inviteCode}`)
    showRegenDialog.value = false
    await loadUsers()
  } catch (err: any) {
    message.error(err.message || '生成失败')
  } finally {
    regenerating.value = false
  }
}

async function doDelete(user: UserData) {
  if (!confirm(`确定要删除用户 "${user.displayName}" 吗？该用户的相册也会被一并删除。`)) {
    return
  }
  try {
    await userApi.remove(user.id)
    message.success('用户已删除')
    await loadUsers()
  } catch (err: any) {
    message.error(err.message || '删除失败')
  }
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code).then(
    () => message.success('邀请码已复制'),
    () => message.error('复制失败，请手动复制')
  )
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  if (!authStore.user?.isAdmin) {
    router.push('/')
    message.error('需要管理员权限')
    return
  }
  await loadUsers()
})
</script>

<style scoped>
.user-admin-page {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
}

.info-card {
  background: #eef2ff;
  color: #4338ca;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.info-card p {
  margin: 0;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-card {
  background: white;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #eaeaea;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.avatar {
  font-size: 40px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
}

.details {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.admin-badge {
  background: #667eea;
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
  font-weight: normal;
}

.invite-code {
  font-size: 13px;
  color: #555;
  margin-bottom: 4px;
}

.invite-code code {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  color: #4338ca;
  font-weight: 600;
}

.invite-code .label {
  color: #888;
}

.copy-btn {
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 4px;
}

.copy-btn:hover {
  background: #f0f0f0;
}

.no-invite {
  font-size: 13px;
  color: #888;
  margin-bottom: 4px;
}

.status-row {
  font-size: 12px;
  color: #888;
}

.status {
  padding: 2px 8px;
  border-radius: 10px;
  margin-right: 8px;
}

.status.active {
  background: #d4edda;
  color: #155724;
}

.status.disabled {
  background: #f8d7da;
  color: #721c24;
}

.user-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.muted {
  color: #999;
  font-size: 13px;
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 8px;
}

.emoji-option {
  font-size: 28px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  line-height: 1;
}

.emoji-option:hover {
  background: #e0e0e0;
}

.emoji-option.active {
  background: #667eea;
  transform: scale(1.2);
}

.hint {
  color: #888;
  font-size: 13px;
  margin: 8px 0 0;
}
</style>