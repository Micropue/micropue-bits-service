<template>
  <div :id="listId" class="command-palette" role="listbox" aria-label="Commands">
    <template v-if="mode === 'commands'">
      <button v-for="(command, index) in commands" :id="`${listId}-${index}`" :key="command.name" type="button"
        tabindex="-1" role="option" :aria-selected="index === activeIndex" class="command-item"
        :class="{ 'is-active': index === activeIndex }" @mouseenter="emit('update:activeIndex', index)"
        @click.stop="emit('pickCommand', command)">
        <span class="command-name command-name--cmd">/{{ command.name }}</span>
        <span v-if="command.aliases.length" class="command-alias">/{{ command.aliases.join(' /') }}</span>
        <span class="command-desc">{{ command.description }}</span>
      </button>
      <p v-if="!commands.length" class="command-empty">No matching command</p>
    </template>

    <template v-else>
      <button v-for="(item, index) in results" :id="`${listId}-${index}`" :key="item.to" type="button" tabindex="-1"
        role="option" :aria-selected="index === activeIndex" class="command-item"
        :class="{ 'is-active': index === activeIndex }" @mouseenter="emit('update:activeIndex', index)"
        @click.stop="emit('pickItem', item.to)">
        <img v-if="item.logo_url" class="command-logo" :src="item.logo_url" alt="" width="18" height="18"
          loading="lazy" @error="($event.target as HTMLImageElement).style.visibility = 'hidden'">
        <span class="command-name">{{ item.name }}</span>
        <span class="command-kind">{{ catalogKindLabel(item.kind) }}</span>
      </button>
      <p v-if="!results.length" class="command-empty">{{ loading ? 'Searching…' : emptyText }}</p>
    </template>

    <div class="command-foot" aria-hidden="true">
      <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
      <span><kbd>Enter</kbd> open</span>
      <span><kbd>Esc</kbd> exit</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { catalogKindLabel, type CatalogCommandDef, type CatalogLookupItem } from '~/composables/useCatalogCommand'

// 指令框结果列表（主页 hero 与全站浮层共用；外观样式在 main.scss 的 .command-*）
defineProps<{
  mode: 'commands' | 'results'
  commands: CatalogCommandDef[]
  results: CatalogLookupItem[]
  activeIndex: number
  listId: string
  loading: boolean
  emptyText: string
}>()

const emit = defineEmits<{
  'update:activeIndex': [index: number]
  pickCommand: [command: CatalogCommandDef]
  pickItem: [to: string]
}>()
</script>
