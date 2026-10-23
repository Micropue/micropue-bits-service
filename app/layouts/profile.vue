<template>
  <NuxtLayout name="default">
    <div v-if="showProfileLayout" class="public-page">
      <div class="profile-layout">
        <ProfileCard :key="username" :username="username" />
        <div class="profile-main" :class="{ 'profile-section-content': active !== 'profile' }">
          <ProfileNav v-if="isOwner" :username="username" :active="active" />
          <div class="profile-route-content">
            <slot />
          </div>
        </div>
      </div>
    </div>
    <slot v-else />
    <Toast />
    <ConfirmDialog />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const username = computed(() => String(route.params.username ?? ''))
const { user: authUser } = useAuthUser()
const isOwner = computed(() =>
  !!authUser.value?.usernameSet && authUser.value.username === username.value
)

const active = computed<'profile' | 'favorites' | 'feedback' | 'requests'>(() => {
  const tab = String(route.query.tab ?? '')
  if (tab === 'favorites') return 'favorites'
  if (tab === 'feedback' || tab === 'reports') return 'feedback'
  if (tab === 'requests') return 'requests'
  return 'profile'
})

// 私有子页面只对本人展示完整主页壳；非本人交给 404 页全屏渲染
const showProfileLayout = computed(() => active.value === 'profile' || isOwner.value)
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
