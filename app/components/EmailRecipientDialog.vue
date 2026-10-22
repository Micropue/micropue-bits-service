<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :style="{ width: '42rem' }" :header="title">
    <div class="recipient-body">
      <div class="recipient-search">
        <InputText v-model="query" :placeholder="t('email.recipients.search')" :aria-label="t('email.recipients.search')"
          autocomplete="off" fluid />
        <Button :label="t('email.recipients.selectAll')" size="small" severity="secondary" outlined
          :disabled="!users.length" @click="selectAllVisible" />
      </div>

      <div class="recipient-manual">
        <InputText v-model="manualEmail" :placeholder="t('email.recipients.manualPlaceholder')"
          :aria-label="t('email.recipients.manualPlaceholder')" autocomplete="off" fluid
          @keydown.enter.prevent="addManual" />
        <Button :label="t('email.recipients.addManual')" size="small" severity="secondary" outlined
          :disabled="!manualEmail.trim()" @click="addManual" />
      </div>
      <p v-if="error" class="recipient-error" role="alert">{{ error }}</p>

      <div v-if="loading && !users.length" class="recipient-state">{{ t('email.loading') }}</div>
      <div v-else-if="!users.length" class="recipient-state">{{ t('email.recipients.empty') }}</div>
      <div v-else class="recipient-list">
        <label v-for="user in users" :key="user.uuid" class="recipient-row">
          <Checkbox :model-value="selectedEmails.includes(user.email)" binary
            :aria-label="`${user.nickname} ${user.email}`"
            @update:model-value="toggle(user.email)" />
          <UserAvatar :src="user.avatarUrl" :size="28" />
          <span class="recipient-main">
            <span class="recipient-name">{{ user.nickname }}</span>
            <span class="recipient-email">{{ user.email }}</span>
          </span>
          <Tag :value="t(`email.userStatus.${user.status}`)" :severity="user.status === 'normal' ? 'secondary' : 'danger'"
            rounded />
        </label>
      </div>

      <div v-if="users.length < total" class="recipient-more">
        <Button :label="t('email.recipients.loadMore')" size="small" severity="secondary" outlined
          :loading="loading" @click="loadUsers(false)" />
      </div>
    </div>

    <template #footer>
      <div class="recipient-footer">
        <span class="recipient-count">{{ t('email.recipients.selectedCount', { count: selectedEmails.length }) }}</span>
        <div class="recipient-footer-actions">
          <Button :label="t('common.cancel')" severity="secondary" text @click="visible = false" />
          <Button :label="t('email.recipients.apply')" @click="apply" />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { EMAIL_RE } from '#shared/utils/validators'

interface RecipientUser {
  uuid: string
  email: string
  username: string | null
  nickname: string
  status: string
  avatarUrl: string | null
}

const props = defineProps<{
  title: string
  selected: string[]
}>()
const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ apply: [emails: string[]] }>()
const { t } = useConsoleI18n()

const query = ref('')
const manualEmail = ref('')
const selectedEmails = ref<string[]>([])
const users = ref<RecipientUser[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
let seq = 0

async function loadUsers(reset: boolean) {
  const current = ++seq
  const offset = reset ? 0 : users.value.length
  loading.value = true
  try {
    const response = await $fetch<{ users: RecipientUser[], total: number }>('/api/dashboard/emails/recipients', {
      query: { q: query.value.trim(), limit: 50, offset }
    })
    if (current !== seq) return
    users.value = reset ? response.users : [...users.value, ...response.users]
    total.value = response.total
  } catch {
    if (current === seq && reset) {
      users.value = []
      total.value = 0
    }
  } finally {
    if (current === seq) loading.value = false
  }
}

watch(visible, open => {
  if (!open) return
  selectedEmails.value = [...props.selected]
  query.value = ''
  manualEmail.value = ''
  error.value = ''
  void loadUsers(true)
})

const search = debounce(() => { void loadUsers(true) }, 250)
watch(query, () => search.run())

function toggle(email: string) {
  selectedEmails.value = selectedEmails.value.includes(email)
    ? selectedEmails.value.filter(item => item !== email)
    : [...selectedEmails.value, email]
}

function selectAllVisible() {
  selectedEmails.value = [...new Set([
    ...selectedEmails.value,
    ...users.value.map(user => user.email)
  ])]
}

function addManual() {
  const values = manualEmail.value.split(/[\s,;]+/).map(value => value.trim().toLowerCase()).filter(Boolean)
  if (!values.length) return
  const invalid = values.find(value => !EMAIL_RE.test(value) || value.length > 254)
  if (invalid) {
    error.value = t('email.recipients.invalid', { email: invalid })
    return
  }
  selectedEmails.value = [...new Set([...selectedEmails.value, ...values])]
  manualEmail.value = ''
  error.value = ''
}

function apply() {
  emit('apply', selectedEmails.value)
  visible.value = false
}
</script>

<style scoped lang="scss">
.recipient-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recipient-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  :deep(.p-inputtext) {
    flex: 1 1 auto;
  }
}

.recipient-manual {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  :deep(.p-inputtext) {
    flex: 1 1 auto;
  }
}

.recipient-list {
  display: flex;
  flex-direction: column;
  max-height: 24rem;
  overflow-y: auto;
  border: 1px solid var(--dash-border);
  border-radius: 0.6rem;
}

.recipient-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid var(--dash-border);
  cursor: pointer;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: var(--dash-active);
  }
}

.recipient-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.recipient-name,
.recipient-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipient-name {
  font-size: 0.86rem;
  font-weight: 500;
}

.recipient-email {
  font-size: 0.74rem;
  color: var(--p-text-muted-color);
}

.recipient-state {
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.recipient-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-red-500, #ef4444);
}

.recipient-more {
  display: flex;
  justify-content: center;
}

.recipient-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.recipient-count {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.recipient-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
</style>
