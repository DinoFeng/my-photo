<template>
  <div class="change-password-container">
    <div class="login-card">
      <div class="logo-section">
        <div class="logo-icon">🔐</div>
        <h1 class="title">设置新密码</h1>
        <p class="subtitle">{{ isFirstTime ? '首次登录，请设置您的个人密码' : '请输入旧密码，然后设置新密码' }}</p>
      </div>

      <div class="form-section">
        <n-form :model="form" label-placement="top">
          <n-form-item v-if="!isFirstTime" label="旧密码">
            <n-input v-model:value="form.oldPassword" type="password" show-password-on="click" placeholder="请输入旧密码" />
          </n-form-item>
          <n-form-item label="新密码">
            <n-input v-model:value="form.newPassword" type="password" show-password-on="click" placeholder="请输入新密码（至少6位）" @keyup.enter="doSubmit" />
          </n-form-item>
          <n-form-item label="确认新密码">
            <n-input v-model:value="form.confirmPassword" type="password" show-password-on="click" placeholder="请再次输入新密码" @keyup.enter="doSubmit" />
          </n-form-item>
        </n-form>

        <n-button
          type="primary"
          block
          size="large"
          :loading="submitting"
          @click="doSubmit"
        >
          {{ isFirstTime ? '设置密码并进入系统' : '修改密码' }}
        </n-button>

        <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMessage } from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const submitting = ref(false)
const errorMessage = ref('')

const isFirstTime = computed(() => authStore.user?.mustChangePassword === true)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

onMounted(async () => {
  // 未登录不能访问
  if (!authStore.user) {
    router.push('/login')
  }
})

async function doSubmit() {
  if (!form.newPassword || form.newPassword.length < 6) {
    message.warning('新密码至少6位')
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    message.warning('两次输入的新密码不一致')
    return
  }
  if (!isFirstTime.value && !form.oldPassword) {
    message.warning('请输入旧密码')
    return
  }

  submitting.value = true
  errorMessage.value = ''
  try {
    await authStore.changePassword(form.newPassword, form.oldPassword || undefined)
    message.success('密码设置成功！')
    router.push('/')
  } catch (err: any) {
    errorMessage.value = err.message || '设置失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.change-password-container {
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

.error-msg {
  color: #d32f2f;
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
}
</style>