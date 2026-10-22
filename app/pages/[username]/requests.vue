<template>
  <AccountRequestsPanel />
</template>

<script setup lang="ts">
import AccountRequestsPanel from '../account/requests.vue'

definePageMeta({ layout: 'profile' })

const username = String(useRoute().params.username ?? '')
await requireProfileOwner(username)
</script>
