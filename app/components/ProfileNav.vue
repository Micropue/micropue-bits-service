<template>
  <nav class="profile-nav" aria-label="Profile sections">
    <NuxtLink :to="`/${username}`" class="profile-nav-link"
      :class="{ 'is-active': active === 'profile' }" :aria-current="active === 'profile' ? 'page' : undefined">
      <User aria-hidden="true" />
      Profile
    </NuxtLink>
    <NuxtLink :to="`/${username}/favorites`" class="profile-nav-link"
      :class="{ 'is-active': active === 'favorites' }" :aria-current="active === 'favorites' ? 'page' : undefined">
      <Bookmark aria-hidden="true" />
      Favorites
    </NuxtLink>
    <NuxtLink :to="`/${username}/feedback`" class="profile-nav-link"
      :class="{ 'is-active': active === 'feedback' }" :aria-current="active === 'feedback' ? 'page' : undefined">
      <Flag aria-hidden="true" />
      Reports &amp; feedback
    </NuxtLink>
    <NuxtLink :to="`/${username}/requests`" class="profile-nav-link"
      :class="{ 'is-active': active === 'requests' }" :aria-current="active === 'requests' ? 'page' : undefined">
      <Folder aria-hidden="true" />
      Requests
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import Bookmark from '@primeicons/vue/bookmark'
import Flag from '@primeicons/vue/flag'
import Folder from '@primeicons/vue/folder'
import User from '@primeicons/vue/user'

defineProps<{
  username: string
  active: 'profile' | 'favorites' | 'feedback' | 'requests'
}>()
</script>

<style scoped lang="scss">
.profile-nav {
  display: flex;
  gap: 0.2rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--p-content-border-color);
  overflow-x: auto;
}

.profile-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem 0.5rem;
  border-bottom: 2px solid transparent;
  color: var(--p-text-muted-color);
  font-size: 0.86rem;
  text-decoration: none;
  white-space: nowrap;

  svg {
    width: 0.95em;
    height: 0.95em;
  }

  &:hover {
    color: var(--p-text-color);
  }

  &.is-active {
    border-bottom-color: var(--p-primary-color);
    color: var(--p-text-color);
    font-weight: 600;
  }
}
</style>
