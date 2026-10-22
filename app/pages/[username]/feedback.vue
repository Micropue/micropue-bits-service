<template>
  <AccountFeedbackPanel />
</template>

<script setup lang="ts">
import AccountFeedbackPanel from '../account/activity.vue'

definePageMeta({ layout: 'profile' })

const username = String(useRoute().params.username ?? '')
await requireProfileOwner(username)
</script>
