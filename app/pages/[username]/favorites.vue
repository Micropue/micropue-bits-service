<template>
  <AccountFavoritesPanel />
</template>

<script setup lang="ts">
import AccountFavoritesPanel from '../account/favorites.vue'

definePageMeta({ layout: 'profile', middleware: 'profile-owner' })
</script>
