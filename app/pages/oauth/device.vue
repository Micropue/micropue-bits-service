<template>
  <div class="device-page">
    <div class="device-card">
      <p class="device-kicker">Bits OAuth</p>

      <template v-if="completed">
        <h1 class="device-title">{{ completed === 'approved' ? 'Device connected' : 'Request denied' }}</h1>
        <p class="device-text">
          {{ completed === 'approved'
            ? 'You can return to the device. It will be signed in shortly.'
            : 'The device was not granted access to your account.' }}
        </p>
        <NuxtLink to="/" class="device-link">Back to BITS</NuxtLink>
      </template>

      <template v-else-if="appInfo">
        <div class="device-app">
          <span class="device-icon">
            <img v-if="appInfo.app.iconUrl && !iconBroken" :src="appInfo.app.iconUrl" alt="" width="44" height="44"
              @error="iconBroken = true">
            <Box v-else aria-hidden="true" />
          </span>
          <div>
            <h1 class="device-title">{{ appInfo.app.name }}</h1>
            <a :href="appInfo.app.homepageUrl" target="_blank" rel="noopener noreferrer" class="device-link">
              {{ hostname(appInfo.app.homepageUrl) }}
            </a>
          </div>
        </div>

        <p class="device-text">
          A device is requesting access to your BITS account. Confirm that the code shown on your device matches
          <strong>{{ appInfo.userCode }}</strong>.
        </p>

        <ul class="device-scopes">
          <li v-for="scope in appInfo.scopes" :key="scope.value">
            <CheckCircle aria-hidden="true" />
            <span>{{ scope.description }}</span>
          </li>
        </ul>

        <p v-if="error" class="device-error" role="alert">{{ error }}</p>
        <div class="device-actions">
          <Button label="Cancel" severity="secondary" text :disabled="busy" @click="decide('deny')" />
          <Button label="Authorize device" :loading="busy" @click="decide('allow')" />
        </div>
      </template>

      <template v-else>
        <h1 class="device-title">Authorize a device</h1>
        <p class="device-text">Enter the code shown on your device.</p>
        <div class="device-form">
          <InputText v-model="userCode" maxlength="9" autocomplete="off" placeholder="ABCD-EFGH"
            aria-label="Device code" @keydown.enter.prevent="lookup" />
          <Button label="Continue" :loading="loading" :disabled="!userCode.trim() || loading" @click="lookup" />
        </div>
        <p v-if="error" class="device-error" role="alert">{{ error }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Box from '@primeicons/vue/box'
import CheckCircle from '@primeicons/vue/check-circle'
import type { AuthUser } from '~/composables/useAuthUser'

interface DeviceInfo {
  userCode: string
  status: string
  app: { name: string, homepageUrl: string, iconUrl: string | null, description: string }
  scopes: { value: string, description: string }[]
}

const route = useRoute()
const userCode = ref(String(route.query.user_code ?? '').toUpperCase())
const appInfo = ref<DeviceInfo | null>(null)
const completed = ref<'' | 'approved' | 'denied'>('')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const iconBroken = ref(false)

const { data: me } = await useFetch<{ user: AuthUser }>('/api/auth/me')
const currentUser = computed(() => me.value?.user ?? null)
if (!currentUser.value) {
  await navigateTo({ path: '/sign', query: { redirect: route.fullPath } })
} else if (!currentUser.value.usernameSet) {
  await navigateTo('/account/profile')
} else if (!currentUser.value.hasPassword) {
  await navigateTo('/account/security')
}

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

async function lookup() {
  if (loading.value || !userCode.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const info = await $fetch<DeviceInfo>('/api/oauth/device', { query: { user_code: userCode.value.trim() } })
    appInfo.value = info
    if (info.status === 'approved' || info.status === 'denied') completed.value = info.status
  } catch (err) {
    appInfo.value = null
    error.value = (err as { statusMessage?: string }).statusMessage ?? 'This code is invalid or has expired.'
  } finally {
    loading.value = false
  }
}

async function decide(decision: 'allow' | 'deny') {
  if (busy.value || !appInfo.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ status: 'approved' | 'denied' }>('/api/oauth/device', {
      method: 'POST',
      body: { userCode: appInfo.value.userCode, decision }
    })
    completed.value = res.status
  } catch (err) {
    error.value = (err as { statusMessage?: string }).statusMessage ?? 'Could not complete device authorization.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  if (userCode.value) void lookup()
})

useHead({
  title: 'Authorize device',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
.device-page {
  display: flex;
  justify-content: center;
  padding: 3.5rem 1.5rem 5rem;
}

.device-card {
  width: min(34rem, 100%);
  padding: 1.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 16px;
  background: var(--p-content-background);
}

.device-kicker {
  margin: 0 0 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.device-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
}

.device-text {
  margin: 1rem 0 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);

  strong {
    color: var(--p-text-color);
  }
}

.device-app {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.device-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 3rem;
  height: 3rem;
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
  border-radius: 12px;
  background: color-mix(in srgb, var(--p-text-color) 5%, var(--p-content-background));

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 1.3rem;
    height: 1.3rem;
    opacity: 0.55;
  }
}

.device-link {
  color: var(--p-primary-color);
  font-size: 0.8rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.device-scopes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1.25rem 0 0;
  padding: 1.25rem 0 0;
  border-top: 1px solid var(--p-content-border-color);
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.86rem;
  }

  svg {
    width: 1em;
    height: 1em;
    color: var(--p-green-600, #16a34a);
  }
}

.device-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;

  :deep(.p-inputtext) {
    flex: 1;
    text-transform: uppercase;
  }
}

.device-error {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--p-red-500, #ef4444);
}

.device-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
</style>
