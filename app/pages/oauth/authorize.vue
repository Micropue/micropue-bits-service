<template>
  <div class="oauth-page">
    <div v-if="errorMessage" class="oauth-card">
      <p class="oauth-kicker">Bits OAuth</p>
      <h1 class="oauth-title">Authorization unavailable</h1>
      <p class="oauth-text">{{ errorMessage }}</p>
      <NuxtLink to="/" class="oauth-link">Back to BITS</NuxtLink>
    </div>

    <div v-else-if="info?.redirect" class="oauth-card">
      <p class="oauth-kicker">Bits OAuth</p>
      <h1 class="oauth-title">Redirecting…</h1>
      <p class="oauth-text">Returning to the application.</p>
    </div>

    <div v-else-if="info" class="oauth-card">
      <p class="oauth-kicker">Authorize application</p>

      <div class="oauth-app">
        <span class="oauth-icon">
          <img v-if="info.app.iconUrl && !iconBroken" :src="info.app.iconUrl" alt="" width="48" height="48"
            @error="iconBroken = true">
          <Box v-else aria-hidden="true" />
        </span>
        <div class="oauth-app-main">
          <h1 class="oauth-title">{{ info.app.name }}</h1>
          <a :href="info.app.homepageUrl" target="_blank" rel="noopener noreferrer" class="oauth-link">
            {{ hostname(info.app.homepageUrl) }}
          </a>
          <span v-if="info.app.owner.username" class="oauth-owner">
            by @{{ info.app.owner.username }}
          </span>
        </div>
      </div>

      <div v-if="currentUser" class="oauth-user">
        <UserAvatar :src="currentUser.githubAvatarUrl" :size="28" />
        <span class="oauth-user-text">
          <span class="oauth-user-label">Signed in as</span>
          <span class="oauth-user-name">{{ currentUser.nickname }}</span>
        </span>
        <span v-if="currentUser.usernameSet" class="oauth-user-handle">@{{ currentUser.username }}</span>
      </div>

      <p class="oauth-text">
        <strong>{{ info.app.name }}</strong> wants to access your BITS account.
        <template v-if="info.app.description">{{ info.app.description }}</template>
      </p>

      <div class="oauth-section">
        <h2 class="oauth-section-title">This will allow the app to</h2>
        <ul class="oauth-scopes">
          <li v-for="scope in info.scopes" :key="scope.value">
            <CheckCircle aria-hidden="true" />
            <span>{{ scope.description }}</span>
          </li>
        </ul>
      </div>

      <p class="oauth-note">Only authorize applications you trust.</p>
      <p v-if="decisionError" class="oauth-error" role="alert">{{ decisionError }}</p>

      <div class="oauth-actions">
        <Button label="Cancel" severity="secondary" text :disabled="busy" @click="decide('deny')" />
        <Button label="Authorize" :loading="busy" @click="decide('allow')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Box from '@primeicons/vue/box'
import CheckCircle from '@primeicons/vue/check-circle'
import type { AuthUser } from '~/composables/useAuthUser'

interface AuthorizeInfo {
  app: {
    clientId: string
    name: string
    homepageUrl: string
    iconUrl: string | null
    description: string
    owner: { username: string | null, nickname: string | null }
  }
  scopes: { value: string, description: string }[]
  consentToken: string
  redirectUri: string
  redirect?: string
}

const route = useRoute()
const busy = ref(false)
const decisionError = ref('')
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

const { data: info, error } = await useFetch<AuthorizeInfo>('/api/oauth/authorize', {
  query: route.query
})

if (info.value?.redirect) {
  await navigateTo(info.value.redirect, { external: true })
}

const errorMessage = computed(() => {
  if (!error.value) return ''
  return error.value.statusMessage || 'This authorization request is invalid or has expired.'
})

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

async function decide(decision: 'allow' | 'deny') {
  if (busy.value || !info.value) return
  busy.value = true
  decisionError.value = ''
  try {
    const res = await $fetch<{ redirect: string }>('/api/oauth/authorize', {
      method: 'POST',
      body: { consentToken: info.value.consentToken, decision }
    })
    window.location.assign(res.redirect)
  } catch (err) {
    decisionError.value = (err as { statusMessage?: string }).statusMessage ?? 'Could not complete authorization.'
  } finally {
    busy.value = false
  }
}

useHead({
  title: 'Authorize application',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
.oauth-page {
  display: flex;
  justify-content: center;
  padding: 3.5rem 1.5rem 5rem;
}

.oauth-card {
  width: min(34rem, 100%);
  padding: 1.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 16px;
  background: var(--p-content-background);
}

.oauth-kicker {
  margin: 0 0 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.oauth-app {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.oauth-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
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
    width: 1.4rem;
    height: 1.4rem;
    opacity: 0.55;
  }
}

.oauth-app-main {
  min-width: 0;
}

.oauth-user {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 1.15rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  background: color-mix(in srgb, var(--p-text-color) 3%, transparent);
}

.oauth-user-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.05rem;
}

.oauth-user-label {
  font-size: 0.68rem;
  color: var(--p-text-muted-color);
}

.oauth-user-name {
  font-size: 0.84rem;
  font-weight: 500;
}

.oauth-user-handle {
  margin-left: auto;
  overflow: hidden;
  font-size: 0.76rem;
  color: var(--p-text-muted-color);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oauth-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.oauth-owner {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.76rem;
  color: var(--p-text-muted-color);
}

.oauth-link {
  display: inline-block;
  margin-top: 0.2rem;
  color: var(--p-primary-color);
  font-size: 0.8rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.oauth-text {
  margin: 1.25rem 0 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);

  strong {
    color: var(--p-text-color);
  }
}

.oauth-section {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--p-content-border-color);
}

.oauth-section-title {
  margin: 0 0 0.65rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.oauth-scopes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
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

.oauth-note {
  margin: 1.25rem 0 0;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.oauth-error {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--p-red-500, #ef4444);
}

.oauth-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
</style>
