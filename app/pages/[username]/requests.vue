<template>
  <AccountRequestsPanel />
</template>

<script setup lang="ts">
import AccountRequestsPanel from '../account/requests.vue'

definePageMeta({ layout: 'profile', middleware: 'profile-owner' })
</script>
