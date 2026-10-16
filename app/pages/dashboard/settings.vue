<template>
  <div class="dash-grid">
    <section class="dash-card dash-card--wide">
      <div class="dash-card-head">
        <h2 class="dash-card-title">{{ t('settings.authentication') }}</h2>
        <Tag v-if="!canConfigure" :value="t('settings.readOnly')" severity="secondary" rounded />
      </div>

      <div class="settings-rows">
        <div v-for="method in ADMIN_AUTH_METHODS" :key="method.key" class="dash-row">
          <div class="dash-row-main">
            <span class="dash-row-label">{{ t(method.labelKey) }}</span>
            <span class="dash-row-desc">{{ t(method.hintKey) }}</span>
          </div>
          <ToggleSwitch v-model="draft[method.key]" :input-id="`auth-${method.key}`" :disabled="!canConfigure"
            :aria-label="t(method.labelKey)" />
        </div>
      </div>

      <p class="dash-card-note">{{ t('settings.note') }}</p>

      <div v-if="canConfigure" class="settings-actions">
        <Button :label="t('settings.save')" size="small" :loading="saving" :disabled="!dirty" @click="save" />
        <Button :label="t('settings.reset')" severity="secondary" text size="small" :disabled="!dirty || saving"
          @click="reset" />
      </div>
    </section>

    <section class="dash-card">
      <div class="dash-card-head">
        <h2 class="dash-card-title">{{ t('settings.session') }}</h2>
        <Tag :value="t('settings.readOnly')" severity="secondary" rounded />
      </div>
      <div class="dash-row">
        <div class="dash-row-main">
          <span class="dash-row-label">{{ t('settings.sessionLifetime') }}</span>
          <span class="dash-row-desc">{{ t('settings.sessionDesc') }}</span>
        </div>
        <span class="dash-value">{{ t('settings.days', { count: sessionDays }) }}</span>
      </div>
    </section>

    <section class="dash-card">
      <div class="dash-card-head">
        <h2 class="dash-card-title">{{ t('settings.account') }}</h2>
      </div>
      <div class="dash-row">
        <div class="dash-row-main">
          <span class="dash-row-label">{{ displayName }}</span>
          <span class="dash-row-desc">{{ t('settings.signedInAdmin') }}</span>
        </div>
      </div>
      <div class="permission-block">
        <p class="dash-card-note">{{ t('settings.permissionsNote') }}</p>
        <div class="permission-list">
          <Tag v-for="permission in user?.permissions ?? []" :key="permission" :value="permission"
            severity="secondary" rounded />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { AdminAuthMethods } from '~/composables/useAdminAuth'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { user, methods } = useAdminAuth()
const toast = useToast()
const { t, restoreLocale } = useConsoleI18n()

onMounted(restoreLocale)

const displayName = computed(() => adminDisplayName(user.value))

const { data } = await useFetch<{ authMethods: AdminAuthMethods, sessionDays: number }>('/api/dashboard/settings')
const sessionDays = computed(() => data.value?.sessionDays ?? ADMIN_SESSION_DAYS)
const canConfigure = computed(() => user.value?.permissions.includes('system.config') ?? false)

const draft = ref<AdminAuthMethods>({ ...(data.value?.authMethods ?? methods.value) })
const saved = ref<AdminAuthMethods>({ ...draft.value })
const saving = ref(false)

const dirty = computed(() => ADMIN_AUTH_METHODS.some(method => draft.value[method.key] !== saved.value[method.key]))

function reset() {
  draft.value = { ...saved.value }
}

async function save() {
  if (saving.value || !dirty.value) return
  saving.value = true
  try {
    const res = await $fetch<{ authMethods: AdminAuthMethods }>('/api/dashboard/settings', {
      method: 'PATCH',
      body: { authMethods: draft.value }
    })
    draft.value = { ...res.authMethods }
    saved.value = { ...res.authMethods }
    // 登录页与概览共用同一份开关状态
    methods.value = { ...res.authMethods }
    toast.add({ severity: 'success', summary: t('toast.configSaved'), life: 3000 })
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    toast.add({
      severity: 'error',
      summary: t('toast.configFailed'),
      detail: e.statusCode === 403 ? t('toast.noConfigPermission') : (e.statusMessage ?? t('common.tryAgain')),
      life: 6000
    })
  } finally {
    saving.value = false
  }
}

useHead({
  title: () => t('title.settings'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style lang="scss" scoped>
.settings-rows {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.settings-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dash-value {
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.permission-block {
  padding-top: 0.9rem;
  border-top: 1px solid var(--dash-border);
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}
</style>
