<template>
  <h2 class="section-title">Content Management</h2>

  <section class="group">
    <h3 class="group-title">My Content</h3>
    <div class="card">
      <div v-for="item in contentItems" :key="item.label" class="row">
        <div class="row-main">
          <span class="row-label">{{ item.label }}</span>
          <span class="row-desc">{{ item.desc }}</span>
        </div>
        <div class="row-control">
          <Button label="Manage" severity="secondary" outlined size="small" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
useHead({ title: 'Content Management' })

const contentItems = [
  { label: 'Snippets', desc: 'Create and manage the code snippets you publish.' },
  { label: 'Groups', desc: 'Organize your snippets into groups.' },
  { label: 'Favorites', desc: 'Snippets you have saved.' },
  { label: 'Following', desc: 'Creators you follow.' }
]
</script>
