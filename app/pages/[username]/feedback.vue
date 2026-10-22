<template>
  <AccountFeedbackPanel />
</template>

<script setup lang="ts">
import AccountFeedbackPanel from '../account/activity.vue'

definePageMeta({ layout: 'profile', middleware: 'profile-owner' })
</script>
