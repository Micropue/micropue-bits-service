<template>
  <div class="overview">
    <section class="ov-grid">
      <article v-for="block in blocks" :key="block.label" class="dash-card ov-block">
        <span class="ov-icon">
          <component :is="block.icon" aria-hidden="true" />
        </span>
        <span class="ov-value">{{ block.value }}</span>
        <span class="ov-label">{{ block.label }}</span>
      </article>
    </section>

    <section class="ov-section">
      <div class="ov-section-head">
        <h2 class="ov-section-title">{{ t('home.needsAttention') }}</h2>
      </div>
      <div class="ov-attention">
        <NuxtLink to="/dashboard/languages/pending" class="dash-card ov-attention-card">
          <div class="ov-attention-top">
            <span class="ov-attention-label">{{ t('home.pendingRequests') }}</span>
            <span class="ov-attention-value">{{ data?.pendingRequests ?? 0 }}</span>
          </div>
          <p class="ov-attention-desc">
            {{ t('home.pendingRequestsDesc', { languages: data?.pendingLanguages ?? 0, dependencies: data?.pendingDependencies ?? 0 }) }}
          </p>
        </NuxtLink>

        <NuxtLink to="/dashboard/reports" class="dash-card ov-attention-card">
          <div class="ov-attention-top">
            <span class="ov-attention-label">{{ t('home.reports') }}</span>
            <span class="ov-attention-value">{{ data?.reports ?? 0 }}</span>
          </div>
          <p class="ov-attention-desc">{{ t('home.reportsDesc') }}</p>
        </NuxtLink>

        <NuxtLink to="/dashboard/changelogs" class="dash-card ov-attention-card">
          <div class="ov-attention-top">
            <span class="ov-attention-label">{{ t('home.changelogDrafts') }}</span>
            <span class="ov-attention-value">{{ data?.changelogDrafts ?? 0 }}</span>
          </div>
          <p class="ov-attention-desc">{{ t('home.changelogDraftsDesc') }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="ov-section">
      <div class="ov-section-head">
        <h2 class="ov-section-title">{{ t('home.quickActions') }}</h2>
      </div>
      <div class="ov-actions">
        <Button :label="t('home.actionRequests')" size="small" severity="secondary" outlined
          @click="navigateTo('/dashboard/languages/pending')" />
        <Button :label="t('home.actionReports')" size="small" severity="secondary" outlined
          @click="navigateTo('/dashboard/reports')" />
        <Button :label="t('home.actionChangelog')" size="small" severity="secondary" outlined
          @click="navigateTo('/dashboard/changelogs')" />
        <Button :label="t('home.actionUsers')" size="small" severity="secondary" outlined
          @click="navigateTo('/dashboard/users')" />
      </div>
    </section>

    <section class="ov-section">
      <div class="ov-section-head">
        <h2 class="ov-section-title">{{ t('home.recent') }}</h2>
      </div>
      <div class="ov-recent">
        <div class="dash-card ov-list-card">
          <div class="ov-list-head">
            <h3 class="ov-list-title">{{ t('home.newUsers') }}</h3>
            <NuxtLink to="/dashboard/users" class="ov-link">{{ t('home.viewAll') }}</NuxtLink>
          </div>
          <div v-if="!data?.recentUsers?.length" class="ov-empty">{{ t('home.noData') }}</div>
          <div v-for="user in data?.recentUsers ?? []" :key="user.uuid" class="ov-list-row">
            <UserAvatar :src="user.avatarUrl" :size="28" />
            <span class="ov-row-main">
              <span class="ov-row-title">{{ user.nickname }}</span>
              <span class="ov-row-sub">{{ user.username ? `@${user.username}` : user.email }}</span>
            </span>
            <span class="ov-row-date">{{ formatDate(user.createdAt) }}</span>
          </div>
        </div>

        <div class="dash-card ov-list-card">
          <div class="ov-list-head">
            <h3 class="ov-list-title">{{ t('home.newSnippets') }}</h3>
            <NuxtLink to="/dashboard/snippets" class="ov-link">{{ t('home.viewAll') }}</NuxtLink>
          </div>
          <div v-if="!data?.recentSnippets?.length" class="ov-empty">{{ t('home.noData') }}</div>
          <NuxtLink v-for="snippet in data?.recentSnippets ?? []" :key="snippet.sid"
            :to="snippet.username ? `/${snippet.username}/${snippet.slug}` : '/dashboard/snippets'" target="_blank"
            class="ov-list-row ov-list-row--link">
            <span class="ov-row-main">
              <span class="ov-row-title">{{ snippet.name }}</span>
              <span class="ov-row-sub">{{ snippet.nickname }} · {{ snippet.languageName ?? 'Snippet' }}</span>
            </span>
            <span class="ov-row-date">{{ formatDate(snippet.createdAt) }}</span>
          </NuxtLink>
        </div>

        <div class="dash-card ov-list-card">
          <div class="ov-list-head">
            <h3 class="ov-list-title">{{ t('home.latestReports') }}</h3>
            <NuxtLink to="/dashboard/reports" class="ov-link">{{ t('home.viewAll') }}</NuxtLink>
          </div>
          <div v-if="!data?.recentReports?.length" class="ov-empty">{{ t('home.noData') }}</div>
          <div v-for="report in data?.recentReports ?? []" :key="report.sid" class="ov-list-row">
            <span class="ov-row-main">
              <span class="ov-row-title">{{ report.target.name }}</span>
              <span class="ov-row-sub">{{ t(`report.target.${report.target.kind}`) }} · {{ t(`report.type.${report.type}`) }}</span>
            </span>
            <span class="ov-row-date">{{ formatDate(report.createdAt) }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Code from '@primeicons/vue/code'
import Copy from '@primeicons/vue/copy'
import Database from '@primeicons/vue/database'
import Folder from '@primeicons/vue/folder'
import Users from '@primeicons/vue/users'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, restoreLocale, locale } = useConsoleI18n()

interface ReportRow {
  sid: string
  type: string
  createdAt: string
  target: { kind: 'user' | 'snippet' | 'group', name: string }
}

interface Stats {
  users: number
  languages: number
  dependencies: number
  snippets: number
  groups: number
  favorites: number
  reports: number
  feedback: number
  pendingRequests: number
  pendingLanguages: number
  pendingDependencies: number
  changelogDrafts: number
  recentUsers: { uuid: string, username: string, nickname: string, email: string, avatarUrl: string | null, createdAt: string }[]
  recentSnippets: { sid: string, slug: string, name: string, username: string, nickname: string, languageName: string | null, createdAt: string }[]
  recentReports: ReportRow[]
}

const { data } = await useFetch<Stats>('/api/dashboard/stats')

const formatter = new Intl.NumberFormat('en')
const format = (value?: number) => (value == null ? '—' : formatter.format(value))

const blocks = computed(() => [
  { label: t('home.users'), value: format(data.value?.users), icon: Users },
  { label: t('home.snippets'), value: format(data.value?.snippets), icon: Copy },
  { label: t('home.snippetGroups'), value: format(data.value?.groups), icon: Folder },
  { label: t('home.languages'), value: format(data.value?.languages), icon: Code },
  { label: t('home.dependencies'), value: format(data.value?.dependencies), icon: Database }
])

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', { dateStyle: 'medium' }) : '—'
}

onMounted(restoreLocale)

useHead({
  title: () => t('title.overview'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
.overview {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.ov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: start;
}

.ov-block {
  align-items: flex-start;
  gap: 0.45rem;
  padding: 1.25rem 1.3rem;
}

.ov-icon {
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  margin-bottom: 0.35rem;
  border-radius: 10px;
  background: var(--dash-active);
  color: var(--p-text-muted-color);

  svg {
    width: 1.1rem;
    height: 1.1rem;
  }
}

.ov-value {
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.ov-label {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.ov-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.ov-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ov-section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.ov-attention {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.ov-attention-card {
  display: block;
  padding: 1.1rem 1.2rem;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: color-mix(in srgb, var(--p-primary-color) 40%, var(--p-content-border-color));
    transform: translateY(-1px);
  }
}

.ov-attention-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.ov-attention-label {
  font-size: 0.85rem;
  font-weight: 600;
}

.ov-attention-value {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.ov-attention-desc {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--p-text-muted-color);
}

.ov-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ov-recent {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  align-items: start;
}

.ov-list-card {
  padding: 1rem 1.1rem;
}

.ov-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.55rem;
}

.ov-list-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
}

.ov-link {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-decoration: none;

  &:hover {
    color: var(--p-text-color);
    text-decoration: underline;
  }
}

.ov-list-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0;
  border-top: 1px solid var(--p-content-border-color);
  color: inherit;
  text-decoration: none;

  &--link:hover .ov-row-title {
    text-decoration: underline;
  }
}

.ov-row-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.ov-row-title {
  overflow: hidden;
  font-size: 0.84rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ov-row-sub {
  overflow: hidden;
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ov-row-date {
  flex: none;
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
}

.ov-empty {
  padding: 0.7rem 0;
  border-top: 1px solid var(--p-content-border-color);
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 700px) {
  .ov-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
