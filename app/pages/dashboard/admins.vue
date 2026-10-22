<template>
  <div class="admins">
    <header class="admins-head">
      <div>
        <h2 class="admins-title">{{ t('admins.title') }}</h2>
        <p class="admins-sub">
          {{ admins.length === 1
            ? t('admins.subtitle', { count: admins.length })
            : t('admins.subtitlePlural', { count: admins.length }) }}
        </p>
      </div>
      <Button :label="t('admins.new')" size="small" @click="openCreate">
        <template #icon>
          <Plus aria-hidden="true" />
        </template>
      </Button>
    </header>

    <DataTable :value="admins" data-key="uuid" class="admins-table">
      <Column field="email" :header="t('admins.col.admin')">
        <template #body="{ data: admin }">
          <div class="cell-main">
            <span class="cell-title">
              {{ admin.email }}
              <StatusTag v-if="admin.uuid === selfUuid" :label="t('admins.you')" status="you" severity="secondary" />
            </span>
            <span class="cell-sub">{{ admin.name || t('admins.noName') }} · {{ methodSummary(admin) }}</span>
          </div>
        </template>
      </Column>

      <Column :header="t('admins.col.status')">
        <template #body="{ data: admin }">
          <StatusTag :label="admin.status === 'normal' ? t('admins.active') : t('admins.disabled')"
            :status="admin.status" :severity="admin.status === 'normal' ? 'secondary' : 'warn'" />
        </template>
      </Column>

      <Column :header="t('admins.col.lastSignIn')">
        <template #body="{ data: admin }">
          <span class="cell-sub">{{ formatDate(admin.last_login_at) }}</span>
        </template>
      </Column>

      <Column header="" style="width: 8rem">
        <template #body="{ data: admin }">
          <div class="cell-actions">
            <Button :label="t('admins.edit')" severity="secondary" text size="small" :disabled="busy"
              @click="openEdit(admin)" />
            <Button v-if="admin.uuid !== selfUuid" :label="t('sec.remove')" severity="danger" text size="small"
              :disabled="busy" @click="remove(admin)" />
          </div>
        </template>
      </Column>

      <template #empty>{{ t('admins.empty') }}</template>
    </DataTable>
  </div>

  <!-- 新建 / 编辑共用同一个弹窗 -->
  <Dialog v-model:visible="dialogVisible" modal :draggable="false" :style="{ width: '28rem' }"
    :header="editing ? t('admins.dialog.edit') : t('admins.dialog.new')">
    <div class="dialog-form">
      <label class="field" for="admin-email">
        <span>{{ t('admins.field.email') }}</span>
        <InputText id="admin-email" v-model="draft.email" name="email" type="email" placeholder="name@example.com"
          autocomplete="off" :disabled="editing" fluid />
      </label>
      <label class="field" for="admin-name">
        <span>{{ t('admins.field.name') }}</span>
        <InputText id="admin-name" v-model="draft.name" name="name" maxlength="64" autocomplete="off"
          :placeholder="t('admins.field.namePlaceholder')" fluid />
      </label>

      <div v-if="editing" class="field field--row">
        <div>
          <span class="field-label">{{ t('admins.field.disabled') }}</span>
          <span class="field-hint">{{ t('admins.field.disabledHint') }}</span>
        </div>
        <ToggleSwitch v-model="draftDisabled" :input-id="`disabled-${draft.uuid}`" :disabled="draft.uuid === selfUuid"
          :aria-label="t('admins.field.disabled')" />
      </div>

      <Message v-if="dialogError" severity="error" :closable="false">{{ dialogError }}</Message>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="dialogVisible = false" />
      <Button :label="editing ? t('common.save') : t('common.create')" :loading="saving" @click="submitDialog" />
    </template>
  </Dialog>

  <ConfirmDialog />
</template>

<script setup lang="ts">
import Plus from '@primeicons/vue/plus'
import type { AdminUser } from '~/composables/useAdminAuth'

// 管理员列表与增删改：所有登录管理员权限相同，都可操作
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface AdminsResponse {
  admins: AdminUser[]
  selfUuid: string
}

const { data, refresh } = await useFetch<AdminsResponse>('/api/dashboard/admins')
const confirm = useConfirm()
const toast = useToast()
const { t, locale, restoreLocale } = useConsoleI18n()

onMounted(restoreLocale)

const selfUuid = computed(() => data.value?.selfUuid ?? '')
const admins = computed(() => data.value?.admins ?? [])

const busy = ref(false)
const saving = ref(false)

const dialogVisible = ref(false)
const dialogError = ref('')
const editing = ref(false)
const draftDisabled = ref(false)
const draft = ref({ uuid: '', email: '', name: '' })
const draftEmailValid = computed(() => EMAIL_RE.test(draft.value.email.trim()))

function notify(severity: 'success' | 'error', summary: string, detail?: string) {
  toast.add({ severity, summary, detail, life: severity === 'error' ? 6000 : 3500 })
}

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en', { dateStyle: 'medium', timeStyle: 'short' })
    : t('admins.never')
}

// 该管理员已绑定的登录方式（邮箱码恒可用）
function methodSummary(admin: AdminUser) {
  const parts = [t('admins.methods.email')]
  if (admin.appBound) parts.push(t('admins.methods.app'))
  if (admin.passkeyCount) {
    parts.push(t(admin.passkeyCount === 1 ? 'admins.methods.passkey' : 'admins.methods.passkeys',
      { count: admin.passkeyCount }))
  }
  return parts.join(' · ')
}

function apiError(err: unknown, fallbackKey: string) {
  const e = err as { statusCode?: number, statusMessage?: string }
  return e.statusMessage ?? t(fallbackKey)
}

function openCreate() {
  draft.value = { uuid: '', email: '', name: '' }
  draftDisabled.value = false
  dialogError.value = ''
  editing.value = false
  dialogVisible.value = true
}

function openEdit(admin: AdminUser) {
  draft.value = { uuid: admin.uuid, email: admin.email, name: admin.name }
  draftDisabled.value = admin.status !== 'normal'
  dialogError.value = ''
  editing.value = true
  dialogVisible.value = true
}

async function submitDialog() {
  if (saving.value) return
  saving.value = true
  dialogError.value = ''
  try {
    if (editing.value) {
      await $fetch(`/api/dashboard/admins/${draft.value.uuid}`, {
        method: 'PATCH',
        body: {
          name: draft.value.name,
          status: draftDisabled.value ? 'disabled' : 'normal'
        }
      })
    } else {
      if (!draftEmailValid.value) {
        dialogError.value = t('auth.error.invalidEmail') + '.'
        return
      }
      await $fetch('/api/dashboard/admins', {
        method: 'POST',
        body: { email: draft.value.email.trim(), name: draft.value.name }
      })
    }
    dialogVisible.value = false
    await refresh()
    notify('success', t(editing.value ? 'toast.adminUpdated' : 'toast.adminAdded'))
  } catch (err) {
    notify('error', t('toast.adminSaveFailed'), apiError(err, 'common.tryAgain'))
  } finally {
    saving.value = false
  }
}

async function remove(admin: AdminUser) {
  if (busy.value) return
  confirm.require({
    header: t('admins.confirm.header'),
    message: t('admins.confirm.message', { email: admin.email }),
    acceptLabel: t('sec.remove'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      busy.value = true
      try {
        await $fetch(`/api/dashboard/admins/${admin.uuid}`, { method: 'DELETE' })
        await refresh()
        notify('success', t('toast.adminRemoved'))
      } catch (err) {
        notify('error', t('toast.adminRemoveFailed'), apiError(err, 'common.tryAgain'))
      } finally {
        busy.value = false
      }
    }
  })
}

useHead({
  title: () => t('title.administrators'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style lang="scss" scoped>
.admins {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.admins-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.admins-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.admins-sub {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.cell-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.cell-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  word-break: break-all;
}

.cell-sub {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.cell-actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--p-text-muted-color);

  &--row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font-weight: 400;
  }
}

.field-label {
  display: block;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.field-hint {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}
</style>

<style lang="scss">
/* DataTable 外观：表头留出高度（列多时也不挤），体行宽松一档；非 scoped，需限定作用域 */
.admins-table {
  overflow-x: auto;
  border: 1px solid var(--dash-border);
  border-radius: 14px;
  background: var(--dash-card);

  .p-datatable-table {
    min-width: 34rem;
  }

  .p-datatable-header-cell {
    padding: 0.85rem 1rem;
    background: var(--dash-hover);
    border-bottom: 1px solid var(--dash-border);
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--p-text-muted-color);
    white-space: nowrap;
  }

  .p-datatable-tbody > tr > td {
    padding: 0.8rem 1rem;
  }

  /* 操作列固定宽度，按钮不挤在一起 */
  .p-datatable-header-cell:last-child,
  .p-datatable-tbody > tr > td:last-child {
    width: 9rem;
    white-space: nowrap;
  }
}
</style>
