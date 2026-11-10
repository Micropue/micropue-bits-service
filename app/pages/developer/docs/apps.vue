<template>
  <div>
    <h2 class="section-title">Apps</h2>
    <p class="page-lead">Apps define the identity shown on OAuth authorization screens.</p>

    <section class="group">
      <div class="card doc-card">
        <h4>Creating an app</h4>
        <p>
          Open <strong>Apps</strong> and choose <strong>New app</strong>. Required fields are the application name,
          homepage URL and description. An icon URL is optional.
        </p>

        <h4>What an app contains</h4>
        <ul>
          <li>Application name</li>
          <li>Homepage URL</li>
          <li>Optional icon URL</li>
          <li>Application description</li>
        </ul>
        <p>
          These fields are displayed to users when they authorize access through this app.
        </p>

        <h4>OAuth service</h4>
        <p>
          Apps do not receive OAuth credentials by themselves. Open <strong>OAuth</strong> in the sidebar, select one
          of your Apps, and register an OAuth service there. The OAuth service owns the redirect URIs, client ID,
          client secret, device-flow setting and token-expiration setting.
        </p>
        <p>
          Each App can have one OAuth service. Create another App first if you need a separate integration.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Apps documentation' })
</script>
