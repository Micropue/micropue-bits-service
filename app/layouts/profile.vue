<template>
  <NuxtLayout name="default">
    <div class="public-page">
      <div v-if="profile" class="profile-layout">
        <ProfileCard :username="username" />
        <div class="profile-main" :class="{ 'profile-section-content': active !== 'profile' }">
          <ProfileNav v-if="profile.isOwner" :username="username" :active="active" />
          <div class="profile-route-content">
            <slot />
          </div>
        </div>
      </div>
      <slot v-else />
    </div>
    <Toast />
    <ConfirmDialog />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const username = computed(() => String(route.params.username ?? ''))
const { data } = await useFetch<{ profile?: { isOwner: boolean } }>(
  () => `/api/users/${encodeURIComponent(username.value)}`,
  { key: () => `public-profile-${username.value}` }
)
const profile = computed(() => data.value?.profile ?? null)

const active = computed<'profile' | 'favorites' | 'feedback' | 'requests'>(() => {
  if (route.path.endsWith('/favorites')) return 'favorites'
  if (route.path.endsWith('/feedback')) return 'feedback'
  if (route.path.endsWith('/requests')) return 'requests'
  return 'profile'
})
</script>

<style scoped lang="scss">
.public-page {
  width: min(1200px, 94vw);
  margin: 0 auto;
  padding: 3rem 0 5rem;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

.profile-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.profile-route-content {
  min-width: 0;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
</style>
