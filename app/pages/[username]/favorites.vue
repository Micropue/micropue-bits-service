<template>
  <AccountFavoritesPanel />
</template>

<script setup lang="ts">
import AccountFavoritesPanel from '../account/favorites.vue'

definePageMeta({ layout: 'profile' })

const username = String(useRoute().params.username ?? '')
await requireProfileOwner(username)
</script>
