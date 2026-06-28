<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo-section">
        <div class="logo-icon">📷</div>
        <h1 class="title">NAS 照片管理</h1>
        <p class="subtitle">家庭照片一站式管理</p>
      </div>

      <div v-if="loading" class="loading">
        <n-spin size="large" />
        <p>加载中...</p>
      </div>

      <div v-else class="form-section">
        <div class="tabs">
          <button
            :class="['tab', { active: loginMode === 'password' }]"
            @click="loginMode = 'password'"
          >🔑 管理员登录</button>
          <button
            :class="['tab', { active: loginMode === 'code' }]"
            @click="loginMode = 'code'"
          >🎫 邀请码登录</button>
        </div>

        <!-- 密码登录 -->
        <div v-if="loginMode === 'password'">
          <n-form :model="passwordForm" label-placement="top">
            <n-form-item label="用户名">
              <n-input v-model:value="passwordForm.username" placeholder="请输入用户名" />
            </n-form-item>
            <n-form-item label="密码">
              <n-input v-model:value="passwordForm.password" type="password" show-password-on="click" placeholder="请输入密码" @keyup.enter="doLogin" />
            </n-form-item>
          </n-form>

          <n-button
            type="primary"
            block
            size="large"
            :loading="submitting"
            @click="doLogin"
          >
            登录
          </n-button>
        </div>

        <!-- 邀请码登录 -->
        <div v-if="loginMode === 'code'">
          <p class="section-desc">使用管理员分配的邀请码登录</p>
          <n-form :model="codeForm" label-placement="top">
            <n-form-item label="邀请码">
              <n-input v-model:value="codeForm.inviteCode" placeholder="请输入邀请码" @keyup.enter="doCodeLogin" />
            </n-form-item>
          </n-form>

          <n-button
            type="primary"
            block
            size="large"
            :loading="submitting"
            @click="doCodeLogin"
          >
            使用邀请码登录
          </n-button>
        </div>

        <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMessage } from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const loading = ref(true)
const submitting = ref(false)
const loginMode = ref<'password' | 'code'>('password')
const errorMessage = ref('')

const passwordForm = reactive({
  username: '',
  password: '',
})

const codeForm = reactive({
  inviteCode: '',
})

onMounted(async () => {
  try {
    await authStore.checkSystemStatus()
    const user = await authStore.fetchCurrentUser()
    if (user) {
      router.push('/')
      return
    }
  } catch {
    // 忽略
  } finally {
    loading.value = false
  }
})

async function doLogin() {
  if (!passwordForm.username || !passwordForm.password) {
    message.warning('请输入用户名和密码')
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    const user = await authStore.login(passwordForm.username, passwordForm.password)
    message.success('登录成功')
    // 首次使用初始化密码，强制改密
    if (user.mustChangePassword) {
      router.push('/change-password')
    } else {
      router.push('/')
    }
  } catch (err: any) {
    errorMessage.value = err.message || '登录失败，请检查用户名和密码'
  } finally {
    submitting.value = false
  }
}

async function doCodeLogin() {
  if (!codeForm.inviteCode) {
    message.warning('请输入邀请码')
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    await authStore.loginWithCode(codeForm.inviteCode.trim())
    message.success('登录成功')
    router.push('/')
  } catch (err: any) {
    errorMessage.value = err.message || '邀请码无效，请检查后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.logo-section {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 64px;
  margin-bottom: 12px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #1a1a1a;
}

.subtitle {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px 0;
  color: #666;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #f0f0f0;
  border-radius: 8px;
  padding: 4px;
}

.tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.tab.active {
  background: white;
  color: #333;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section-desc {
  color: #888;
  text-align: center;
  margin: 0 0 24px;
  font-size: 14px;
}

.error-msg {
  color: #d32f2f;
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
}
</style>