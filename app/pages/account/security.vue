<template>
  <h2 class="section-title">Login Security</h2>

  <section class="group">
    <h3 class="group-title">Credentials</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Password</span>
          <span class="row-desc">Set or change your sign-in password.</span>
        </div>
        <div class="row-control">
          <Button label="Change password" severity="secondary" outlined size="small" />
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
</template>

<script setup lang="ts">
useHead({ title: 'Login Security' })

const { user: authUser } = useAuthUser()

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
</script>
