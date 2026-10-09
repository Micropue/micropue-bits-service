<template>
  <div class="account-page">
    <p class="account-email">{{ email }}</p>
    <Button label="Sign out" severity="secondary" outlined :loading="signingOut" @click="signOut" />
  </div>
</template>

<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuthUser'

useHead({ title: 'Account' })

const signingOut = ref(false)
const { user: authUser } = useAuthUser()

const { data } = await useFetch<{ user: AuthUser }>('/api/auth/me')
const email = computed(() => data.value?.user?.email ?? '')

if (data.value?.user) {
  authUser.value = data.value.user
} else {
  await navigateTo('/sign')
}

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

<style scoped>
.account-page {
  min-height: 65vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 0 1.5rem;
}

.account-email {
  margin: 0;
  font-size: 1.1rem;
}
</style>
