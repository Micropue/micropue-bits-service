<template>
  <Dialog v-model:visible="visible" modal :draggable="false" header="Login devices" :style="{ width: '34rem' }">
    <template v-if="phase === 'list'">
      <p v-if="loading" class="dv-empty">Loading…</p>
      <p v-else-if="devices.length === 0" class="dv-empty">No devices found.</p>
      <ul v-else class="dv-list">
        <li v-for="d in devices" :key="d.id" class="dv-item">
          <div class="dv-info">
            <span class="dv-name">
              {{ d.name }}
              <span v-if="d.current" class="dv-badge">Current</span>
            </span>
            <span class="dv-meta">{{ d.type }} · Signed in {{ d.loginAt }}</span>
          </div>
          <Button v-if="!d.current" label="Remove" severity="danger" text size="small" :disabled="busy"
            @click="askRemove(d)" />
        </li>
      </ul>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </template>

    <div v-else class="dialog-form">
      <p class="dv-confirm">{{ confirmMessage }}</p>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>

    <template #footer>
      <template v-if="phase === 'list'">
        <Button label="Close" severity="secondary" text @click="visible = false" />
        <Button v-if="othersCount > 0" label="Sign out other devices" severity="secondary" outlined :loading="busy"
          @click="askOthers" />
      </template>
      <template v-else>
        <Button label="Cancel" severity="secondary" text @click="phase = 'list'" />
        <Button label="Sign out" severity="danger" :loading="busy" @click="doConfirm" />
      </template>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
interface Device {
  id: string
  name: string
  type: string
  loginAt: string
  current: boolean
}

const emit = defineEmits<{ changed: [] }>()
const visible = defineModel<boolean>({ default: false })

const devices = ref<Device[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const phase = ref<'list' | 'confirm'>('list')
const confirmTarget = ref<{ kind: 'one' | 'others'; id?: string; name?: string } | null>(null)

const othersCount = computed(() => devices.value.filter(d => !d.current).length)
const confirmMessage = computed(() =>
  confirmTarget.value?.kind === 'others'
    ? 'Sign out all other devices? They will be signed out immediately, even if their sessions have not expired.'
    : `Sign out "${confirmTarget.value?.name}"? It will be signed out immediately, even if its session has not expired.`
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ devices: Device[] }>('/api/auth/devices')
    devices.value = res.devices
  } catch {
    error.value = 'Failed to load devices.'
  } finally {
    loading.value = false
  }
}

watch(visible, open => {
  if (open) {
    phase.value = 'list'
    error.value = ''
    load()
  }
})

function askRemove(d: Device) {
  confirmTarget.value = { kind: 'one', id: d.id, name: d.name }
  error.value = ''
  phase.value = 'confirm'
}

function askOthers() {
  confirmTarget.value = { kind: 'others' }
  error.value = ''
  phase.value = 'confirm'
}

async function doConfirm() {
  if (busy.value || !confirmTarget.value) return
  busy.value = true
  error.value = ''
  try {
    if (confirmTarget.value.kind === 'others') {
      await $fetch('/api/auth/devices/revoke-others', { method: 'POST' })
    } else {
      await $fetch('/api/auth/devices/revoke', { method: 'POST', body: { id: confirmTarget.value.id } })
    }
    await load()
    phase.value = 'list'
    emit('changed')
  } catch {
    error.value = 'Something went wrong. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped lang="scss">
.dv-empty {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.dv-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dv-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
}

.dv-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dv-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  font-weight: 500;
}

.dv-badge {
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--p-green-600);
  background: color-mix(in srgb, var(--p-green-500) 15%, transparent);
}

.dv-meta {
  margin-top: 0.15rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.25rem;
}

.dv-confirm {
  margin: 0;
  font-size: 0.92rem;
}

.dialog-error {
  color: var(--p-red-500);
  font-size: 0.85rem;
}
</style>
