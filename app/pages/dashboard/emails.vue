<template>
  <div class="c-page">
    <header class="c-page-head">
      <div>
        <h2 class="c-page-title">{{ t('email.title') }}</h2>
        <p class="c-page-sub">{{ t('email.subtitle') }}</p>
        <p v-if="!fromEmail" class="c-page-note">{{ t('email.notConfigured') }}</p>
      </div>
      <Button :label="t('email.new')" size="small" @click="openCompose">
        <template #icon><Envelope /></template>
      </Button>
    </header>

    <section class="email-stats">
      <div class="dash-card email-stat">
        <span class="email-stat-value">{{ sentCount }}</span>
        <span class="email-stat-label">{{ t('email.stats.sent') }}</span>
      </div>
      <div class="dash-card email-stat">
        <span class="email-stat-value">{{ draftCount }}</span>
        <span class="email-stat-label">{{ t('email.stats.drafts') }}</span>
      </div>
      <div class="dash-card email-stat">
        <span class="email-stat-value">{{ failedCount }}</span>
        <span class="email-stat-label">{{ t('email.stats.failed') }}</span>
      </div>
    </section>

    <div class="email-tabs">
      <SelectButton v-model="tab" :options="tabOptions" option-label="label" option-value="value"
        :allow-empty="false" :aria-label="t('email.tabs.label')" />
    </div>

    <ConsoleDataTable :value="filteredRows" :columns="columns" data-key="sid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['subject', 'to_text', 'status']" @refresh="refresh">
      <template #cell-subject="{ row }">
        <div class="c-cell-text">
          <span class="c-cell-title">{{ row.subject || t('email.untitled') }}</span>
          <span class="c-cell-sub">{{ row.to_text || t('email.noRecipients') }}</span>
        </div>
      </template>

      <template #cell-recipientCount="{ row }">
        <span class="email-count">{{ row.recipientCount }}</span>
      </template>

      <template #cell-status="{ row }">
        <Tag :value="t(`email.status.${row.status}`)" :severity="statusSeverity(row.status)" rounded />
      </template>

      <template #cell-time="{ row }">
        {{ formatDate(row.sentAt || row.updatedAt) }}
      </template>

      <template #cell-actions="{ row }">
        <div class="c-cell-actions">
          <Button v-if="row.status === 'draft' || row.status === 'failed'" :label="t('email.edit')" severity="secondary"
            text size="small" @click="openEdit(row)" />
          <Button :label="t('email.view')" severity="secondary" text size="small" @click="openDetail(row)" />
          <Button :label="t('email.delete')" severity="danger" text size="small" @click="askDelete(row)" />
        </div>
      </template>
    </ConsoleDataTable>
  </div>

  <!-- 写邮件 -->
  <Dialog v-model:visible="composerVisible" modal :draggable="false"
    :style="{ width: '58rem', maxWidth: '94vw' }" :header="editingSid ? t('email.editDraft') : t('email.compose')">
    <div class="compose">
      <div class="compose-from">
        <span class="compose-label">{{ t('email.from') }}</span>
        <span class="compose-from-value">{{ fromEmail || t('email.notConfigured') }}</span>
      </div>

      <div v-for="field in RECIPIENT_FIELDS" :key="field" class="compose-recipient">
        <span class="compose-label">{{ t(`email.${field}`) }}</span>
        <div class="recipient-chips">
          <span v-for="email in draft[field]" :key="email" class="recipient-chip">
            {{ email }}
            <button type="button" class="recipient-chip-remove" :aria-label="`Remove ${email}`"
              @click="removeRecipient(field, email)">×</button>
          </span>
          <button type="button" class="recipient-add" @click="openPicker(field)">
            + {{ t('email.addRecipients') }}
          </button>
        </div>
      </div>

      <label class="compose-field" for="email-subject">
        <span class="compose-label">{{ t('email.subject') }}</span>
        <InputText id="email-subject" v-model="draft.subject" maxlength="200" autocomplete="off" fluid />
      </label>

      <div class="compose-body">
        <div class="compose-body-head">
          <span class="compose-label">{{ t('email.body') }}</span>
          <Button :label="preview ? t('email.write') : t('email.preview')" size="small" text severity="secondary"
            @click="preview = !preview" />
        </div>
        <div v-if="preview" class="email-preview">{{ draft.body || t('email.emptyBody') }}</div>
        <Textarea v-else v-model="draft.body" rows="12" maxlength="100000" auto-resize fluid
          :placeholder="t('email.bodyPlaceholder')" />
      </div>

      <p v-if="composerError" class="compose-error" role="alert">{{ composerError }}</p>
    </div>

    <template #footer>
      <div class="compose-footer">
        <span class="compose-hint">{{ t('email.recipientLimit', { count: recipientCount }) }}</span>
        <div class="compose-footer-actions">
          <Button :label="t('common.cancel')" severity="secondary" text @click="composerVisible = false" />
          <Button :label="t('email.saveDraft')" severity="secondary" outlined :loading="savingDraft"
            :disabled="sending || !canSaveDraft" @click="submit('draft')" />
          <Button :label="t('email.send')" :loading="sending" :disabled="savingDraft || !canSend" @click="submit('send')">
            <template #icon><Send /></template>
          </Button>
        </div>
      </div>
    </template>
  </Dialog>

  <!-- 收件人选择 -->
  <EmailRecipientDialog v-model:visible="pickerVisible" :title="pickerTitle" :selected="pickerSelected"
    @apply="applyRecipients" />

  <!-- 邮件详情 -->
  <Dialog v-model:visible="detailVisible" modal :draggable="false" :style="{ width: '48rem', maxWidth: '94vw' }"
    :header="t('email.detail.title')">
    <div v-if="detail" class="email-detail">
      <div class="email-detail-head">
        <h3 class="email-detail-subject">{{ detail.subject || t('email.untitled') }}</h3>
        <Tag :value="t(`email.status.${detail.status}`)" :severity="statusSeverity(detail.status)" rounded />
      </div>
      <div class="email-detail-grid">
        <span class="c-k">{{ t('email.from') }}</span><span class="c-v">{{ fromEmail }}</span>
        <span class="c-k">{{ t('email.to') }}</span>
        <span class="c-v email-detail-chips">
          <span v-for="email in detail.to" :key="email" class="recipient-chip">{{ email }}</span>
          <span v-if="!detail.to.length" class="c-muted">—</span>
        </span>
        <span class="c-k">{{ t('email.cc') }}</span>
        <span class="c-v email-detail-chips">
          <span v-for="email in detail.cc" :key="email" class="recipient-chip">{{ email }}</span>
          <span v-if="!detail.cc.length" class="c-muted">—</span>
        </span>
        <span class="c-k">{{ t('email.bcc') }}</span>
        <span class="c-v email-detail-chips">
          <span v-for="email in detail.bcc" :key="email" class="recipient-chip">{{ email }}</span>
          <span v-if="!detail.bcc.length" class="c-muted">—</span>
        </span>
        <span class="c-k">{{ t('email.sentAt') }}</span><span class="c-v">{{ detail.sentAt ? formatDate(detail.sentAt) : '—' }}</span>
      </div>
      <p v-if="detail.error" class="email-detail-error">{{ detail.error }}</p>
      <div class="email-detail-body">{{ detail.body }}</div>
    </div>
    <template #footer>
      <Button :label="t('common.close')" severity="secondary" text @click="detailVisible = false" />
    </template>
  </Dialog>

  <ConfirmDialog />
</template>

<script setup lang="ts">
import Envelope from '@primeicons/vue/envelope'
import Send from '@primeicons/vue/send'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, restoreLocale, locale } = useConsoleI18n()
const toast = useToast()
const confirm = useConfirm()
onMounted(restoreLocale)

type EmailStatus = 'draft' | 'sent' | 'failed'
type RecipientField = 'to' | 'cc' | 'bcc'

interface EmailRow {
  sid: string
  subject: string
  body: string
  to: string[]
  cc: string[]
  bcc: string[]
  to_text: string
  status: EmailStatus
  error: string
  sentAt: string | null
  createdAt: string
  updatedAt: string
  time?: string
  recipientCount: number
}

const { data, pending, refresh } = await useFetch<{
  from: string
  configured: boolean
  emails: EmailRow[]
}>('/api/dashboard/emails')

const fromEmail = computed(() => data.value?.from ?? '')
const emails = computed<EmailRow[]>(() => (data.value?.emails ?? []).map(email => ({
  ...email,
  to_text: email.to.join(', '),
  time: email.sentAt || email.updatedAt
})))
const sentCount = computed(() => emails.value.filter(email => email.status === 'sent').length)
const draftCount = computed(() => emails.value.filter(email => email.status === 'draft').length)
const failedCount = computed(() => emails.value.filter(email => email.status === 'failed').length)

const tab = ref<'all' | EmailStatus>('all')
const tabOptions = computed(() => [
  { label: t('email.tabs.all'), value: 'all' },
  { label: t('email.status.sent'), value: 'sent' },
  { label: t('email.status.draft'), value: 'draft' },
  { label: t('email.status.failed'), value: 'failed' }
])
const filteredRows = computed(() => tab.value === 'all'
  ? emails.value
  : emails.value.filter(email => email.status === tab.value))

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'subject', header: t('email.col.subject'), width: '24rem' },
  { field: 'recipientCount', header: t('email.col.recipients'), width: '8rem', dataType: 'numeric' },
  { field: 'status', header: t('email.col.status'), width: '8rem', matchMode: 'equals' },
  { field: 'time', header: t('email.col.time'), type: 'date', width: '11rem' },
  { field: 'actions', header: t('catalog.actions'), type: 'actions', sortable: false, width: '12rem',
    frozen: true, frozenAlign: 'right' }
])

const RECIPIENT_FIELDS: RecipientField[] = ['to', 'cc', 'bcc']
const composerVisible = ref(false)
const editingSid = ref('')
const draft = ref<{ subject: string, body: string, to: string[], cc: string[], bcc: string[] }>({
  subject: '',
  body: '',
  to: [],
  cc: [],
  bcc: []
})
const preview = ref(false)
const savingDraft = ref(false)
const sending = ref(false)
const composerError = ref('')
const pickerVisible = ref(false)
const pickerField = ref<RecipientField>('to')

const recipientCount = computed(() => draft.value.to.length + draft.value.cc.length + draft.value.bcc.length)
const canSaveDraft = computed(() => !!(draft.value.subject.trim() || draft.value.body.trim()))
const canSend = computed(() => !!(draft.value.to.length && draft.value.subject.trim() && draft.value.body.trim()))

const pickerTitle = computed(() => `${t('email.addRecipients')} · ${t(`email.${pickerField.value}`)}`)
const pickerSelected = computed(() => draft.value[pickerField.value])

const detailVisible = ref(false)
const detail = ref<EmailRow | null>(null)

function statusSeverity(status: string) {
  if (status === 'failed') return 'danger'
  if (status === 'draft') return 'warn'
  return 'secondary'
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', { dateStyle: 'medium' }) : '—'
}

function openCompose() {
  editingSid.value = ''
  draft.value = { subject: '', body: '', to: [], cc: [], bcc: [] }
  preview.value = false
  composerError.value = ''
  composerVisible.value = true
}

async function openEdit(row: EmailRow) {
  try {
    const response = await $fetch<{ email: EmailRow }>(`/api/dashboard/emails/${encodeURIComponent(row.sid)}`)
    editingSid.value = row.sid
    draft.value = {
      subject: response.email.subject,
      body: response.email.body,
      to: response.email.to,
      cc: response.email.cc,
      bcc: response.email.bcc
    }
    preview.value = false
    composerError.value = ''
    composerVisible.value = true
  } catch (err) {
    toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? t('common.tryAgain'), life: 5000 })
  }
}

function openPicker(field: RecipientField) {
  pickerField.value = field
  pickerVisible.value = true
}

function applyRecipients(emailsToAdd: string[]) {
  draft.value[pickerField.value] = emailsToAdd
}

function removeRecipient(field: RecipientField, email: string) {
  draft.value[field] = draft.value[field].filter(item => item !== email)
}

async function submit(action: 'draft' | 'send') {
  if (sending.value || savingDraft.value) return
  if (action === 'send') sending.value = true
  else savingDraft.value = true
  composerError.value = ''
  try {
    const body = { ...draft.value, action }
    const response = editingSid.value
      ? await $fetch<{ email: EmailRow }>(`/api/dashboard/emails/${encodeURIComponent(editingSid.value)}`, { method: 'PATCH', body })
      : await $fetch<{ email: EmailRow }>('/api/dashboard/emails', { method: 'POST', body })
    composerVisible.value = false
    await refresh()
    toast.add({
      severity: 'success',
      summary: action === 'send' ? t('toast.emailSent') : t('toast.emailDraftSaved'),
      detail: action === 'send' ? `${response.email.recipientCount}` : undefined,
      life: 3000
    })
  } catch (err) {
    const e = err as { statusMessage?: string, data?: { sid?: string } }
    if (e.data?.sid) editingSid.value = e.data.sid
    composerError.value = e.statusMessage ?? t('common.tryAgain')
    await refresh()
  } finally {
    sending.value = false
    savingDraft.value = false
  }
}

async function openDetail(row: EmailRow) {
  try {
    const response = await $fetch<{ email: EmailRow }>(`/api/dashboard/emails/${encodeURIComponent(row.sid)}`)
    detail.value = response.email
    detailVisible.value = true
  } catch (err) {
    toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? t('common.tryAgain'), life: 5000 })
  }
}

function askDelete(row: EmailRow) {
  confirm.require({
    header: t('email.deleteTitle'),
    message: t('email.deleteMessage', { subject: row.subject || t('email.untitled') }),
    acceptLabel: t('email.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      try {
        await $fetch(`/api/dashboard/emails/${encodeURIComponent(row.sid)}`, { method: 'DELETE' })
        await refresh()
        toast.add({ severity: 'success', summary: t('toast.emailDeleted'), life: 3000 })
      } catch (err) {
        toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? t('common.tryAgain'), life: 5000 })
      }
    }
  })
}

useHead({
  title: () => t('title.email'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
@use '../../assets/css/console-content.scss';

.email-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.email-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 1rem 1.15rem;
}

.email-stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.email-stat-label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.email-tabs {
  display: flex;
  align-items: center;
}

.email-count {
  font-variant-numeric: tabular-nums;
}

.compose {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.compose-from,
.compose-recipient,
.compose-field {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  align-items: start;
  gap: 0.65rem;
}

.compose-label {
  padding-top: 0.55rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.compose-from-value {
  padding-top: 0.55rem;
  font-size: 0.85rem;
}

.recipient-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.35rem;
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--dash-border);
  border-radius: 0.5rem;
  background: var(--p-content-background);
}

.recipient-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  background: var(--dash-active);
  font-size: 0.74rem;
}

.recipient-chip-remove {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  line-height: 1;
  opacity: 0.65;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
}

.recipient-add {
  min-height: 1.85rem;
  padding: 0.3rem 0.65rem;
  border: 1px dashed var(--dash-border);
  border-radius: 0.4rem;
  background: var(--dash-active);
  color: var(--p-text-color);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    border-color: var(--p-primary-color);
    color: var(--p-primary-color);
  }
}

.compose-field {
  align-items: center;

  .compose-label {
    padding-top: 0;
  }
}

.compose-body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.compose-body-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.compose-body-head .compose-label {
  padding-top: 0;
}

.email-preview {
  min-height: 15rem;
  padding: 1rem;
  border: 1px solid var(--dash-border);
  border-radius: 0.5rem;
  background: var(--p-content-background);
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.compose-error,
.email-detail-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-red-500, #ef4444);
  white-space: pre-line;
}

.compose-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.compose-hint {
  font-size: 0.76rem;
  color: var(--p-text-muted-color);
}

.compose-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.email-detail {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.email-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.email-detail-subject {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.email-detail-grid {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 0.55rem 0.75rem;
  font-size: 0.84rem;
}

.email-detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.email-detail-body {
  max-height: 26rem;
  padding: 1rem;
  overflow: auto;
  border: 1px solid var(--dash-border);
  border-radius: 0.5rem;
  background: var(--p-content-background);
  font-size: 0.88rem;
  line-height: 1.7;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

@media (max-width: 700px) {
  .email-stats {
    grid-template-columns: 1fr;
  }

  .compose-from,
  .compose-recipient,
  .compose-field {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  .compose-label {
    padding-top: 0;
  }

  .compose-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .compose-footer-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
</style>
