<template>
  <div class="cdt">
    <!-- 工具栏：搜索（含匹配方式，可做排除）+ 页面自定义按钮 + 分类 / 列 / 导出 / 刷新 -->
    <div class="cdt-bar">
      <div class="cdt-search">
        <InputText id="cdt-search" v-model="search" name="cdt-search" autocomplete="off"
          :placeholder="t('table.search')" :aria-label="t('table.search')" />
      </div>

      <slot name="toolbar" />

      <div class="cdt-bar-right">
        <Select v-if="groupColumns.length" input-id="cdt-group" v-model="groupField" :options="groupOptions"
          option-label="label" option-value="value" :aria-label="t('table.group')" :placeholder="t('table.group')"
          class="cdt-group" />

        <Popover ref="columnsRef">
          <div class="cdt-columns">
            <p class="cdt-columns-title">{{ t('table.columns') }}</p>
            <label v-for="column in props.columns" :key="column.field" class="cdt-column-row">
              <Checkbox binary :model-value="!hiddenFields.includes(column.field)"
                @update:model-value="(checked: boolean) => setColumnVisible(column.field, checked)" />
              <span>{{ column.header }}</span>
            </label>
          </div>
        </Popover>
        <Button severity="secondary" outlined size="small" :aria-label="t('table.columns')" :title="t('table.columns')"
          @click="toggleColumns($event)">
          <template #icon>
            <Columns2 aria-hidden="true" />
          </template>
        </Button>

        <Button severity="secondary" outlined size="small" :aria-label="t('table.export')" :title="t('table.export')"
          @click="exportCsv">
          <template #icon>
            <Download aria-hidden="true" />
          </template>
        </Button>

        <Button severity="secondary" outlined size="small" :aria-label="t('table.refresh')" :title="t('table.refresh')"
          @click="$emit('refresh')">
          <template #icon>
            <Refresh aria-hidden="true" />
          </template>
        </Button>
      </div>
    </div>

    <!-- 多选后的批量操作条 -->
    <div v-if="selection?.length" class="cdt-bulk">
      <span class="cdt-bulk-count">{{ t('table.selected', { count: selection.length }) }}</span>
      <slot name="bulk" :selection="selection" />
      <Button :label="t('table.clearSelection')" severity="secondary" text size="small" @click="selection = []" />
    </div>

    <DataTable ref="tableRef" v-model:filters="filters" v-model:selection="selection" :value="props.value"
      :data-key="props.dataKey" :loading="props.loading" :global-filter-fields="searchFields" :rows="rows"
      :rows-per-page-options="rowsPerPageOptions" :selection-mode="props.selectable ? 'multiple' : undefined"
      :row-group-mode="groupField ? 'subheader' : undefined" :group-rows-by="groupField || undefined" removable-sort
      resizable-columns scrollable scroll-height="flex" filter-display="row" paginator
      :paginator-template="'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport'"
      :current-page-report-template="t('table.pageReport')" class="cdt-table" :pt="{ root: { class: 'cdt-table' } }">
      <Column v-if="props.selectable" selection-mode="multiple" :exportable="false" style="width: 3rem" />

      <Column v-for="column in visibleColumns" :key="column.field" :field="column.field" :header="column.header"
        :sortable="column.type === 'actions' ? false : column.sortable !== false" :data-type="column.dataType"
        :filter-match-mode="column.matchMode ?? 'contains'" :show-filter-operator="true" :show-clear-button="true"
        :show-filter-menu="column.type !== 'actions'" :exportable="column.type !== 'actions'"
        :frozen="column.frozen" :align-frozen="column.frozenAlign ?? 'left'"
        :style="columnStyle(column)" :body-class="column.align ? `cdt-align-${column.align}` : undefined">
        <template #body="{ data }">
          <slot :name="`cell-${column.field}`" :data="data" :value="data[column.field]" :row="data">
            {{ display(data[column.field], column) }}
          </slot>
        </template>

        <!-- 列筛选（行内）：操作符下拉 + 值；操作符含 不等于 / 不包含 等，可做排除 -->
        <template v-if="column.type !== 'actions'" #filter="{ filterModel, filterCallback }">
          <div class="cdt-filter">
            <Select :input-id="`cdt-filter-${column.field}-op`" v-model="filterModel.matchMode"
              :options="matchModes(column)" option-label="label" option-value="value" class="cdt-filter-op" fluid
              @change="filterCallback()" />
            <Select v-if="column.options" :input-id="`cdt-filter-${column.field}`" v-model="filterModel.value"
              :options="column.options" option-label="label" option-value="value" show-clear
              :placeholder="t('table.filterValue')" fluid @change="filterCallback()" />
            <InputNumber v-else-if="column.dataType === 'numeric'" :input-id="`cdt-filter-${column.field}`"
              v-model="filterModel.value" :use-grouping="false" :placeholder="t('table.filterValue')" fluid
              @input="filterCallback()" />
            <InputText v-else :id="`cdt-filter-${column.field}`" :name="`cdt-filter-${column.field}`"
              v-model="filterModel.value" autocomplete="off" :placeholder="t('table.filterValue')" fluid
              @input="filterCallback()" />
          </div>
        </template>
      </Column>

      <!-- 分组头：显示翻译后的分类名与条目数 -->
      <template #groupheader="slot">
        <span class="cdt-group-head">{{ groupLabel(slot?.data) }}</span>
      </template>

      <template #empty>
        <span class="cdt-empty">{{ t('table.empty') }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import Columns2 from '@primeicons/vue/columns-2'
import Download from '@primeicons/vue/download'
import Refresh from '@primeicons/vue/refresh'
import type { DataTableFilterMeta } from 'primevue/datatable'

// 控制台通用数据表：搜索（含匹配方式，可做排除）、列过滤与操作符、分类分组、
// 列显示开关、多选批量操作、排序、分页、CSV 导出、列宽拖拽（Excel 式用法）
// 规范详见 docs-internal/项目综合设计.md「后台系统 / 数据表」

export interface ConsoleColumn {
  field: string
  header: string
  /** text | number | date | enum | actions（enum 按 options 显示标签，actions 为操作列） */
  type?: 'text' | 'number' | 'date' | 'enum' | 'actions'
  /** PrimeVue dataType：numeric / date，影响过滤表单 */
  dataType?: string
  width?: string
  align?: 'left' | 'center' | 'right'
  matchMode?: string
  options?: { label: string, value: string }[]
  /** 冻结列：横向滚动时始终可见（操作列用） */
  frozen?: boolean
  frozenAlign?: 'left' | 'right'
  groupable?: boolean
  sortable?: boolean
  defaultHidden?: boolean
}

const props = withDefaults(defineProps<{
  value: Record<string, unknown>[]
  columns: ConsoleColumn[]
  dataKey: string
  loading?: boolean
  rows?: number
  selectable?: boolean
  /** 全局搜索覆盖的字段，默认取所有文本列 */
  searchFields?: string[]
}>(), {
  loading: false,
  rows: 25,
  selectable: true
})

const emit = defineEmits<{ refresh: [] }>()

const { t, locale } = useConsoleI18n()
const tableRef = ref<{
  exportCSV: (options?: Record<string, unknown>) => void
} | null>(null)
const columnsRef = ref<{ toggle: (event: Event) => void } | null>(null)

// 全局搜索（包含匹配）；筛选与排除由各列自带的过滤器菜单完成
// （菜单里可选 等于 / 不等于 / 包含 / 不包含 … 等操作符，并可叠加多条规则）
const rowsPerPageOptions = [10, 25, 50, 100, 200]

const search = ref('')

const searchFields = computed(() => props.searchFields ??
  props.columns.filter(column => (column.type ?? 'text') === 'text').map(column => column.field))

// 列过滤：每列一个 filter 对象（PrimeVue 菜单式过滤器自带操作符）
const filters = ref<DataTableFilterMeta>({ global: { value: null, matchMode: 'contains' } })
watch(search, value => {
  filters.value.global = { value: value || null, matchMode: 'contains' }
})

// 每列可选的操作符（枚举只需等于/不等于；数字额外的比较；文本含包含/不包含）
function matchModes(column: ConsoleColumn) {
  const all = [
    { label: t('table.match.contains'), value: 'contains' },
    { label: t('table.match.notContains'), value: 'notContains' },
    { label: t('table.match.equals'), value: 'equals' },
    { label: t('table.match.notEquals'), value: 'notEquals' },
    { label: t('table.match.startsWith'), value: 'startsWith' },
    { label: t('table.match.endsWith'), value: 'endsWith' },
    { label: t('table.match.lt'), value: 'lt' },
    { label: t('table.match.lte'), value: 'lte' },
    { label: t('table.match.gt'), value: 'gt' },
    { label: t('table.match.gte'), value: 'gte' }
  ]
  if (column.options) return all.filter(item => ['equals', 'notEquals'].includes(item.value))
  if (column.dataType === 'numeric') {
    return all.filter(item => ['equals', 'notEquals', 'lt', 'lte', 'gt', 'gte'].includes(item.value))
  }
  return all.filter(item => ['contains', 'notContains', 'equals', 'notEquals', 'startsWith', 'endsWith'].includes(item.value))
}

function buildFilters() {
  const next: DataTableFilterMeta = { global: filters.value.global }
  for (const column of props.columns) {
    next[column.field] = { value: null, matchMode: column.matchMode ?? 'contains' }
  }
  filters.value = next
}

watch(() => props.columns, buildFilters, { immediate: true, deep: true })

// 列显示开关
const hiddenFields = ref<string[]>(props.columns.filter(column => column.defaultHidden).map(column => column.field))
const visibleColumns = computed(() => props.columns.filter(column => !hiddenFields.value.includes(column.field)))

function setColumnVisible(field: string, visible: boolean) {
  hiddenFields.value = visible
    ? hiddenFields.value.filter(item => item !== field)
    : [...hiddenFields.value, field]
}

function toggleColumns(event: Event) {
  columnsRef.value?.toggle(event)
}

// 分类（分组）
const groupColumns = computed(() => props.columns.filter(column => column.groupable))
const groupField = ref<string>('')
const groupOptions = computed(() => [
  { label: t('table.groupNone'), value: '' },
  ...groupColumns.value.map(column => ({ label: column.header, value: column.field }))
])

function groupLabel(data: unknown): string {
  const field = groupField.value
  const raw = (data && typeof data === 'object' && field in (data as Record<string, unknown>))
    ? (data as Record<string, unknown>)[field]
    : data
  const value = String(raw ?? '')
  const column = props.columns.find(item => item.field === field)
  const option = column?.options?.find(item => item.value === value)
  const label = option?.label ?? value
  const count = props.value.filter(row => String(row[field] ?? '') === value).length
  return `${label} · ${t('table.items', { count })}`
}

// 单元格默认渲染
function display(value: unknown, column: ConsoleColumn): string {
  if (value === null || value === undefined || value === '') return '—'
  if (column.type === 'enum') {
    return column.options?.find(option => option.value === String(value))?.label ?? String(value)
  }
  if (column.type === 'date') {
    return new Date(String(value)).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en',
      { dateStyle: 'medium', timeStyle: 'short' })
  }
  return String(value)
}

function columnStyle(column: ConsoleColumn) {
  return { width: column.width, minWidth: column.width }
}

// 选择与导出
const selection = defineModel<Record<string, unknown>[]>('selection', { default: () => [] })

function exportCsv() {
  tableRef.value?.exportCSV({ selectionOnly: !!selection.value?.length })
}

watch(locale, () => {
  // 语言切换后日期/枚举列重新渲染（数据不变）
})

defineExpose({ clearSelection: () => { selection.value = [] } })
void emit
</script>

<style lang="scss" scoped>
.cdt {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.cdt-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.cdt-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  :deep(.p-inputtext) {
    width: 15rem;
  }
}

/* 行内筛选：操作符在上、值在下，窄列也放得下 */
.cdt-filter {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 7rem;
}

.cdt-filter-op {
  :deep(.p-select-label) {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
  }
}

.cdt-bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.cdt-group {
  width: 11rem;
}

.cdt-columns {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 11rem;
}

.cdt-columns-title {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.cdt-column-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.cdt-bulk {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--dash-border);
  border-radius: 12px;
  background: var(--dash-hover);
}

.cdt-bulk-count {
  font-size: 0.85rem;
  font-weight: 500;
}

.cdt-group-head {
  font-size: 0.85rem;
  font-weight: 600;
}

.cdt-empty {
  display: block;
  padding: 2rem 0;
  text-align: center;
  color: var(--p-text-muted-color);
}
</style>

<style lang="scss">
/* 表格外观：表头留足高度，体行宽松；非 scoped，需限定作用域 */
.cdt-table {
  overflow-x: auto;
  border: 1px solid var(--dash-border);
  border-radius: 14px;
  background: var(--dash-card);

  .p-datatable-header-cell {
    padding: 0.8rem 0.9rem;
    background: var(--dash-hover);
    border-bottom: 1px solid var(--dash-border);
    font-size: 0.9rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .p-datatable-tbody > tr > td {
    padding: 0.7rem 0.9rem;
  }

  .p-datatable-row-group-header > td {
    padding: 0.5rem 0.9rem;
    background: var(--dash-active);
  }

  .cdt-align-right {
    text-align: right;
  }

  .cdt-align-center {
    text-align: center;
  }

  .p-paginator {
    border-top: 1px solid var(--dash-border);
    background: transparent;
  }
}
</style>
