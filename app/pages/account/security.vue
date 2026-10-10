<template>
  <h2 class="section-title">Login Security</h2>

  <section class="group">
    <h3 class="group-title">Credentials</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Password <ExclamationTriangle v-if="!hasPassword" class="row-warn"
              aria-label="Action required" /></span>
          <span class="row-desc">
            {{ hasPassword ? 'Change your sign-in password.' : 'No password set. Set one to sign in without an email code.' }}
          </span>
        </div>
        <div class="row-control">
          <Button :label="hasPassword ? 'Change password' : 'Set password'" severity="secondary" outlined size="small"
            @click="passwordOpen = true" />
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">GitHub</span>
          <span class="row-desc">Link a GitHub account for one-click sign-in.</span>
        </div>
        <div class="row-control">
          <Button label="Link" severity="secondary" outlined size="small" />
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">Passkeys</span>
          <span class="row-desc">Sign in without a password using passkeys.</span>
        </div>
        <div class="row-control">
          <Button label="Add passkey" severity="secondary" outlined size="small" />
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">Authenticator App</span>
          <span class="row-desc">Use a time-based one-time code app for two-factor authentication.</span>
        </div>
        <div class="row-control">
          <Button label="Set up" severity="secondary" outlined size="small" />
        </div>
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-title">Devices</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Current device</span>
          <span class="row-desc">This session is active right now.</span>
        </div>
        <div class="row-control">
          <Button label="Manage" severity="secondary" outlined size="small" />
        </div>
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-title">Session</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Sign out</span>
          <span class="row-desc">End this session on this device.</span>
        </div>
        <div class="row-control">
          <Button label="Sign out" severity="secondary" outlined size="small" :loading="signingOut" @click="signOut" />
        </div>
      </div>
    </div>
  </section>

  <!-- 设置 / 修改密码 -->
  <PasswordDialog v-model="passwordOpen" />
</template>

<script setup lang="ts">
import ExclamationTriangle from '@primeicons/vue/exclamation-triangle'

useHead({ title: 'Login Security' })

const { user: authUser } = useAuthUser()
const hasPassword = computed(() => authUser.value?.hasPassword ?? false)

const signingOut = ref(false)
async function signOut() {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // 请求失败也按已退出处理（Cookie 会在下次校验时失效）
  }
  authUser.value = null
  await navigateTo('/')
}

/* ---------------- 设置 / 修改密码 ---------------- */
const passwordOpen = ref(false)
</script>

<style scoped lang="scss">
.row-warn {
  width: 0.9em;
  height: 0.9em;
  margin-left: 0.35rem;
  color: var(--p-orange-500);
  vertical-align: -0.12em;
}
</style>
