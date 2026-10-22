<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :style="{ width: '34rem' }"
    :header="kind === 'group' ? 'Reorder groups' : 'Reorder snippets'">
    <div v-if="loading" class="order-loading">Loading…</div>

    <div v-else class="order-body">
      <p class="order-note">
        Drag to reorder. Pinned items stay at the top; you can pin up to {{ maxPinned }}.
        <template v-if="total > items.length"> Showing {{ items.length }} of {{ total }} unpinned items; unloaded items keep their current order.</template>
      </p>

      <div v-if="pinned.length" class="order-pinned">
        <p class="order-label"><Thumbtack aria-hidden="true" /> Pinned</p>
        <div v-for="item in pinned" :key="item.slug" class="order-row order-row--pinned">
          <span class="order-name">{{ item.name }}</span>
          <Tag :value="visibilityLabel(item.visibility)" severity="secondary" rounded />
        </div>
      </div>

      <div v-if="!items.length" class="order-empty">
        {{ kind === 'group' ? 'No unpinned groups to reorder.' : 'No unpinned snippets to reorder.' }}
      </div>
      <div v-else class="order-list">
        <div v-for="(item, index) in items" :key="item.slug" class="order-row"
          :class="{ 'is-dragging': dragIndex === index }" draggable="true"
          @dragstart="onDragStart(index)" @dragover.prevent @drop.prevent="onDrop(index)"
          @dragend="resetDrag">
          <Bars class="order-handle" aria-hidden="true" />
          <span class="order-name">{{ item.name }}</span>
          <Tag :value="visibilityLabel(item.visibility)" severity="secondary" rounded />
          <span class="order-moves">
            <Button size="small" text rounded severity="secondary" aria-label="Move up" :disabled="index === 0"
              @click="move(index, -1)">
              <template #icon><ArrowUp /></template>
            </Button>
            <Button size="small" text rounded severity="secondary" aria-label="Move down"
              :disabled="index === items.length - 1" @click="move(index, 1)">
              <template #icon><ArrowDown /></template>
            </Button>
          </span>
        </div>
      </div>

      <div v-if="hasMore" class="order-more">
        <Button label="Load more" size="small" severity="secondary" outlined :loading="loading"
          @click="load(false)" />
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button label="Save order" :loading="saving" :disabled="loading || saving || !items.length" @click="save" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import ArrowDown from '@primeicons/vue/arrow-down'
import ArrowUp from '@primeicons/vue/arrow-up'
import Bars from '@primeicons/vue/bars'
import Thumbtack from '@primeicons/vue/thumbtack'

interface OrderItem {
  slug: string
  name: string
  visibility: string
}

const props = defineProps<{
  kind: 'snippet' | 'group'
}>()
const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const pinned = ref<OrderItem[]>([])
const items = ref<OrderItem[]>([])
const allSlugs = ref<string[]>([])
const total = ref(0)
const hasMore = ref(false)
const maxPinned = ref(3)
const dragIndex = ref<number | null>(null)

function visibilityLabel(value: string) {
  return value === 'public' ? 'Public' : value === 'unlisted' ? 'Unlisted' : 'Private'
}

async function load(reset: boolean) {
  const offset = reset ? 0 : items.value.length
  loading.value = true
  try {
    const response = await $fetch<{
      pinned: OrderItem[]
      items: OrderItem[]
      allSlugs: string[]
      total: number
      hasMore: boolean
      maxPinned: number
    }>('/api/profile/order', {
      query: { kind: props.kind, limit: 50, offset }
    })
    if (reset) {
      pinned.value = response.pinned
      items.value = response.items
      allSlugs.value = response.allSlugs
    } else {
      items.value = [...items.value, ...response.items]
    }
    total.value = response.total
    hasMore.value = response.hasMore
    maxPinned.value = response.maxPinned
  } catch (err) {
    toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? 'Could not load order', life: 4000 })
    if (reset) visible.value = false
  } finally {
    loading.value = false
  }
}

watch(visible, open => {
  if (open) void load(true)
})

function onDragStart(index: number) {
  dragIndex.value = index
}

function resetDrag() {
  dragIndex.value = null
}

function onDrop(index: number) {
  if (dragIndex.value == null || dragIndex.value === index) {
    resetDrag()
    return
  }
  const next = [...items.value]
  const [moved] = next.splice(dragIndex.value, 1)
  next.splice(index, 0, moved)
  items.value = next
  resetDrag()
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  const next = [...items.value]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  items.value = next
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const loaded = new Set(items.value.map(item => item.slug))
    const slugs = [
      ...items.value.map(item => item.slug),
      ...allSlugs.value.filter(slug => !loaded.has(slug))
    ]
    await $fetch('/api/profile/order', {
      method: 'PUT',
      body: { kind: props.kind, slugs }
    })
    toast.add({ severity: 'success', summary: 'Order saved', life: 2500 })
    visible.value = false
    emit('saved')
  } catch (err) {
    toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? 'Could not save order', life: 4000 })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.order-body {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.order-note,
.order-label,
.order-empty {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.order-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;

  svg {
    width: 0.9rem;
    height: 0.9rem;
  }
}

.order-pinned,
.order-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.order-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.5rem;
  background: var(--p-content-background);
  cursor: grab;

  &.is-dragging {
    opacity: 0.5;
  }

  &--pinned {
    cursor: default;
    background: color-mix(in srgb, var(--p-text-color) 4%, var(--p-content-background));
  }
}

.order-handle {
  width: 0.9rem;
  height: 0.9rem;
  opacity: 0.45;
  flex: none;
}

.order-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
}

.order-moves {
  display: flex;
  flex: none;
}

.order-more {
  display: flex;
  justify-content: center;
  padding-top: 0.25rem;
}

.order-loading {
  padding: 1.5rem 0;
  text-align: center;
  color: var(--p-text-muted-color);
}
</style>
