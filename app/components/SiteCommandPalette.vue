<template>
  <Teleport to="body">
    <Transition name="command-fade">
      <div v-if="open" class="command-overlay" @mousedown.self="close">
        <div class="command-dialog" role="dialog" aria-modal="true" aria-label="Catalog commands">
          <div class="command-field">
            <span v-if="command" class="command-prefix" aria-hidden="true">{{ prefix }}</span>
            <input id="site-command-input" ref="inputEl" v-model="text" class="command-input" type="text"
              name="command" autocomplete="off" spellcheck="false" :placeholder="placeholder" role="combobox"
              aria-autocomplete="list" aria-label="Catalog command" :aria-expanded="showPalette"
              :aria-controls="listId" :aria-activedescendant="activeOptionId"
              @keydown.space="handleSpace" @keydown.delete="handleBackspace" @paste="handlePaste"
              @keydown.down="onArrow($event, 1)" @keydown.up="onArrow($event, -1)"
              @keydown.enter="onEnter" @keydown.esc.stop.prevent="close">
          </div>

          <CatalogCommandList v-if="showPalette" v-model:active-index="activeIndex" :mode="mode"
            :commands="commandMatches" :results="results" :list-id="listId" :loading="resultsLoading"
            :empty-text="emptyText" class="command-palette--static"
            @pick-command="setCommand" @pick-item="go" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// 全站指令框浮层：任何站点页面按 / 唤起（首页由 hero 搜索框自己处理，这里跳过）
// 逻辑与主页共用 useCatalogCommand；样式在 main.scss 的 .command-* / .command-overlay
import type { CatalogCommandDef } from '~/composables/useCatalogCommand'

const route = useRoute()

const open = ref(false)
const command = ref<CatalogCommandDef | null>(null)
const text = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
let previousFocus: HTMLElement | null = null

const {
  listId, mode, prefix, placeholder, commandMatches, results, resultsLoading, activeIndex, activeList,
  emptyText, setCommand, handleSpace, handleBackspace, handlePaste, move, choose, go, dispose
} = useCatalogCommand(command, text, {
  idPrefix: 'site-command',
  focusInput: () => inputEl.value?.focus(),
  onOpen: to => {
    close()
    void navigateTo(to)
  }
})

const showPalette = computed(() => open.value)
const activeOptionId = computed(() =>
  showPalette.value && activeList.value.length ? `${listId}-${activeIndex.value}` : undefined)

function onArrow(event: KeyboardEvent, delta: number) {
  if (!showPalette.value || !activeList.value.length) return
  event.preventDefault()
  move(delta)
}

function onEnter(event: KeyboardEvent) {
  if (!showPalette.value) return
  event.preventDefault()
  choose()
}

function openPalette() {
  previousFocus = document.activeElement as HTMLElement | null
  command.value = null
  text.value = '/'
  open.value = true
  nextTick(() => inputEl.value?.focus())
}

function close() {
  if (!open.value) return
  open.value = false
  command.value = null
  text.value = ''
  dispose()
  const target = previousFocus
  previousFocus = null
  nextTick(() => target?.focus?.())
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (open.value || !isSlashShortcut(event)) return
  if (isEditableTarget(event.target)) return
  // 首页的 hero 搜索框自己处理 /
  if (route.path === '/') return
  event.preventDefault()
  openPalette()
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  dispose()
})

// 顶栏入口点击调用
defineExpose({ open: openPalette })
</script>
