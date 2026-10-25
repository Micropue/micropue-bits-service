<template>
  <section class="contribution-card" aria-labelledby="contributions-title">
    <header class="contribution-head">
      <div>
        <h2 id="contributions-title" class="contribution-title">Contributions</h2>
        <p class="contribution-sub">
          {{ total }} {{ total === 1 ? 'contribution' : 'contributions' }} in the last year
        </p>
      </div>
      <div class="view-switch" role="group" aria-label="Contribution view">
        <button v-for="option in VIEW_OPTIONS" :key="option.value" type="button" class="view-button"
          :class="{ 'is-active': view === option.value }" :aria-pressed="view === option.value"
          @click="view = option.value">
          {{ option.label }}
        </button>
      </div>
    </header>

    <p v-if="error" class="contribution-state">Could not load contribution activity.</p>
    <template v-else>
      <div class="contribution-summary" :class="{ 'is-loading': pending }">
        <div class="summary-item">
          <strong>{{ total }}</strong>
          <span>Total</span>
          <small>Last 12 months</small>
        </div>
        <div class="summary-item">
          <strong>{{ thisWeek }}</strong>
          <span>This week</span>
          <small>{{ weekRange }}</small>
        </div>
        <div class="summary-item">
          <strong>{{ bestDay.count }}</strong>
          <span>Best day</span>
          <small>{{ bestDay.count ? formatDay(bestDay.date) : 'No activity yet' }}</small>
        </div>
        <div class="summary-item summary-item--average">
          <strong>{{ average }}</strong>
          <span>Average / day</span>
          <small>Across the last year</small>
        </div>
      </div>

      <div class="streak-row">
        <div class="streak-item">
          <strong>{{ longestStreak.count }} {{ longestStreak.count === 1 ? 'day' : 'days' }}</strong>
          <span>Longest streak</span>
          <small>{{ longestStreak.count ? formatRange(longestStreak.start, longestStreak.end) : 'No activity yet' }}</small>
        </div>
        <div class="streak-item">
          <strong>{{ currentStreak.count }} {{ currentStreak.count === 1 ? 'day' : 'days' }}</strong>
          <span>Current streak</span>
          <small>{{ currentStreak.count ? formatRange(currentStreak.start, currentStreak.end) : 'No current streak' }}</small>
        </div>
      </div>

      <div v-if="view !== '2d'" class="chart-3d" :class="{ 'is-loading': pending }">
        <div class="chart-3d-scroll">
          <svg class="iso-chart" viewBox="80 -20 540 340" role="img"
            :aria-label="`${total} contributions in the last year`">
            <g class="iso-grid">
              <polygon v-for="cell in gridCells" :key="cell.key" class="grid-cell" :points="cell.points" />
            </g>
            <g class="iso-bars">
              <g v-for="bar in bars" :key="bar.key" class="iso-bar">
                <polygon class="bar-side bar-side--left" :class="`level-${bar.level}`" :points="bar.left" />
                <polygon class="bar-side bar-side--right" :class="`level-${bar.level}`" :points="bar.right" />
                <polygon class="bar-top" :class="`level-${bar.level}`" :points="bar.top">
                  <title>{{ bar.title }}</title>
                </polygon>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <div v-if="view !== '3d'" class="calendar-scroll" :class="{ 'is-loading': pending }">
        <div class="calendar-layout">
          <div class="calendar-months" :style="{ width: `${weeks.length * 14}px` }" aria-hidden="true">
            <span v-for="label in monthLabels" :key="`${label.column}-${label.label}`" class="month-label"
              :style="{ left: `${(label.column - 1) * 14}px` }">{{ label.label }}</span>
          </div>

          <div class="calendar-body">
            <div class="weekday-labels" aria-hidden="true">
              <span class="weekday-label weekday-label--mon">Mon</span>
              <span class="weekday-label weekday-label--wed">Wed</span>
              <span class="weekday-label weekday-label--fri">Fri</span>
            </div>

            <div class="weeks">
              <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="week">
                <span v-for="(day, dayIndex) in week" :key="dayIndex" class="day"
                  :class="day && day.inRange ? `level-${day.level}` : 'is-empty'"
                  :title="day && day.inRange ? dayTitle(day) : undefined"
                  :aria-label="day && day.inRange ? dayTitle(day) : undefined" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="contribution-foot">
        <span class="contribution-note">Creating snippets, groups and feedback counts as activity.</span>
        <span class="legend">
          <span>Less</span>
          <i class="legend-day level-0" />
          <i class="legend-day level-1" />
          <i class="legend-day level-2" />
          <i class="legend-day level-3" />
          <i class="legend-day level-4" />
          <span>More</span>
        </span>
      </footer>
    </template>
  </section>
</template>

<script setup lang="ts">
interface ContributionDay {
  date: string
  count: number
}

interface ContributionResponse {
  days: ContributionDay[]
  total: number
}

interface CalendarDay {
  date: string
  count: number
  level: number
  inRange: boolean
}

interface IsoCell {
  key: string
  points: string
}

interface IsoBar extends IsoCell {
  level: number
  title: string
  top: string
  left: string
  right: string
  x: number
  y: number
}

type ViewMode = '2d' | '3d' | 'both'

const props = defineProps<{ username: string }>()

const VIEW_OPTIONS: { value: ViewMode, label: string }[] = [
  { value: '2d', label: '2D' },
  { value: '3d', label: '3D' },
  { value: 'both', label: 'Both' }
]

const { data, pending, error, refresh } = await useFetch<ContributionResponse>(
  () => `/api/users/${encodeURIComponent(props.username)}/contributions`,
  { key: `contributions-${props.username}` }
)

const contentRefresh = useState('profile-content-refresh', () => 0)
watch(contentRefresh, () => { void refresh() })

// 视图偏好：存 cookie，SSR 首屏就能按上次选择渲染，刷新后不会闪回默认值
const viewCookie = useCookie<ViewMode>('bits-contribution-view', {
  default: () => '3d',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax'
})
const initialView = VIEW_OPTIONS.some(option => option.value === viewCookie.value) ? viewCookie.value : '3d'
const view = ref<ViewMode>(initialView)
watch(view, value => { viewCookie.value = value })

const total = computed(() => data.value?.total ?? 0)
const counts = computed(() => new Map((data.value?.days ?? []).map(day => [day.date, day.count])))

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function level(count: number) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

const today = startOfDay(new Date())
const yearStart = new Date(today)
yearStart.setDate(yearStart.getDate() - 364)
const gridStart = new Date(yearStart)
gridStart.setDate(gridStart.getDate() - gridStart.getDay())

function calendarDay(date: Date): CalendarDay {
  const key = dateKey(date)
  const count = counts.value.get(key) ?? 0
  return {
    date: key,
    count,
    level: level(count),
    inRange: date >= yearStart && date <= today
  }
}

const yearDays = computed<CalendarDay[]>(() => {
  const days: CalendarDay[] = []
  const cursor = new Date(yearStart)
  while (cursor <= today) {
    days.push(calendarDay(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
})

const weeks = computed<Array<Array<CalendarDay | null>>>(() => {
  const result: Array<Array<CalendarDay | null>> = []
  const cursor = new Date(gridStart)

  while (cursor <= today) {
    if (cursor.getDay() === 0) result.push([])
    result[result.length - 1]!.push(calendarDay(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  const lastWeek = result[result.length - 1]
  if (lastWeek) {
    while (lastWeek.length < 7) lastWeek.push(null)
  }
  return result
})

const monthLabels = computed(() => {
  const candidates: { label: string; column: number }[] = []
  let previousMonth = -1

  weeks.value.forEach((week, index) => {
    const first = week.find(day => day?.inRange)
    if (!first) return
    const date = parseDate(first.date)
    if (date.getMonth() !== previousMonth) {
      candidates.push({
        label: date.toLocaleDateString('en', { month: 'short' }),
        column: index + 1
      })
      previousMonth = date.getMonth()
    }
  })

  // 首周若只是月份尾巴，直接让下一个月先出现，避免两个标签挤在一起
  const labels: { label: string; column: number }[] = []
  candidates.forEach((candidate, index) => {
    if (!labels.length && candidates[index + 1] && candidates[index + 1]!.column - candidate.column < 4) return
    const previous = labels[labels.length - 1]
    if (previous && candidate.column - previous.column < 4) return
    labels.push(candidate)
  })

  return labels
})

function formatDay(value: string) {
  return value ? parseDate(value).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'
}

function formatRange(start: string, end: string) {
  if (!start || !end) return '—'
  return `${formatDay(start)} – ${formatDay(end)}`
}

const thisWeek = computed(() => {
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 6)
  const startKey = dateKey(weekStart)
  return yearDays.value
    .filter(day => day.date >= startKey)
    .reduce((sum, day) => sum + day.count, 0)
})

const weekRange = computed(() => {
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 6)
  return formatRange(dateKey(weekStart), dateKey(today))
})

const bestDay = computed(() => {
  return yearDays.value.reduce(
    (best, day) => day.count > best.count ? { date: day.date, count: day.count } : best,
    { date: '', count: 0 }
  )
})

const average = computed(() => (total.value / 365).toFixed(2))

const streakStats = computed(() => {
  let longest = { count: 0, start: '', end: '' }
  let run = 0
  let runStart = ''
  let previousDate = ''

  for (const day of yearDays.value) {
    if (day.count > 0) {
      if (!run) runStart = day.date
      run += 1
      previousDate = day.date
      if (run > longest.count) {
        longest = { count: run, start: runStart, end: previousDate }
      }
    } else {
      run = 0
      runStart = ''
    }
  }

  let currentCount = 0
  let currentStart = ''
  for (let index = yearDays.value.length - 1; index >= 0; index -= 1) {
    const day = yearDays.value[index]!
    if (day.count <= 0) break
    currentStart = day.date
    currentCount += 1
  }

  return {
    longest,
    current: {
      count: currentCount,
      start: currentStart,
      end: currentCount ? dateKey(today) : ''
    }
  }
})

const longestStreak = computed(() => streakStats.value.longest)
const currentStreak = computed(() => streakStats.value.current)

const ISO_LEFT = 160
const ISO_TOP = 70
const ISO_X = 8
const ISO_Y = 4
const ISO_HX = 7
const ISO_HY = 3.5

function isoX(week: number, day: number) {
  return ISO_LEFT + (week - day) * ISO_X
}

function isoY(week: number, day: number) {
  return ISO_TOP + (week + day) * ISO_Y
}

function diamondPoints(x: number, y: number) {
  return `${x},${y - ISO_HY} ${x + ISO_HX},${y} ${x},${y + ISO_HY} ${x - ISO_HX},${y}`
}

const gridCells = computed<IsoCell[]>(() => {
  const cells: IsoCell[] = []
  weeks.value.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      if (!day?.inRange) return
      const x = isoX(weekIndex, dayIndex)
      const y = isoY(weekIndex, dayIndex)
      cells.push({ key: day.date, points: diamondPoints(x, y) })
    })
  })
  return cells
})

const bars = computed<IsoBar[]>(() => {
  const result: IsoBar[] = []
  weeks.value.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      if (!day?.inRange || day.count <= 0) return
      const x = isoX(weekIndex, dayIndex)
      const y = isoY(weekIndex, dayIndex)
      const height = Math.min(12 + day.count * 5, 72)
      const topY = y - height
      const date = formatDay(day.date)
      result.push({
        key: day.date,
        level: day.level,
        title: `${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} on ${date}`,
        points: diamondPoints(x, topY),
        top: diamondPoints(x, topY),
        left: `${x - ISO_HX},${topY} ${x},${topY + ISO_HY} ${x},${y + ISO_HY} ${x - ISO_HX},${y}`,
        right: `${x},${topY + ISO_HY} ${x + ISO_HX},${topY} ${x + ISO_HX},${y} ${x},${y + ISO_HY}`,
        x,
        y
      } as IsoBar)
    })
  })
  // 后端先画，前端后画，避免高位柱遮挡关系反转
  return result.sort((a, b) => a.y - b.y || a.x - b.x)
})

function dayTitle(day: CalendarDay) {
  const date = parseDate(day.date).toLocaleDateString('en', { dateStyle: 'medium' })
  if (!day.count) return `No contributions on ${date}`
  return `${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} on ${date}`
}
</script>

<style scoped lang="scss">
.contribution-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem 1.05rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.9rem;
  background: var(--p-content-background);
}

.contribution-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.contribution-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.contribution-sub {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.view-switch {
  display: inline-flex;
  flex: none;
  padding: 0.15rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.45rem;
  background: color-mix(in srgb, var(--p-text-color) 3%, transparent);
}

.view-button {
  padding: 0.3rem 0.5rem;
  border: 0;
  border-radius: 0.3rem;
  background: transparent;
  color: var(--p-text-muted-color);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;

  &:hover {
    color: var(--p-text-color);
  }

  &.is-active {
    background: var(--p-content-background);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--p-text-color) 12%, transparent);
    color: var(--p-text-color);
    font-weight: 600;
  }
}

.contribution-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;

  &.is-loading {
    opacity: 0.55;
  }
}

.chart-3d.is-loading,
.calendar-scroll.is-loading {
  opacity: 0.55;
}

.summary-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--p-text-color) 2%, var(--p-content-background));

  strong {
    font-size: 1.1rem;
    line-height: 1.2;
  }

  span {
    margin-top: 0.15rem;
    font-size: 0.74rem;
    color: var(--p-text-muted-color);
  }

  small {
    margin-top: 0.1rem;
    overflow: hidden;
    font-size: 0.68rem;
    color: var(--p-text-muted-color);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &--average strong {
    font-size: 0.95rem;
  }
}

.streak-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.streak-item {
  display: flex;
  flex-direction: column;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.6rem;

  strong {
    font-size: 0.9rem;
  }

  span {
    margin-top: 0.1rem;
    font-size: 0.74rem;
    color: var(--p-text-muted-color);
  }

  small {
    margin-top: 0.1rem;
    font-size: 0.68rem;
    color: var(--p-text-muted-color);
  }
}

.chart-3d {
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.65rem;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--p-text-color) 2.5%, transparent), transparent 55%);
}

.chart-3d-scroll {
  overflow-x: auto;
  padding: 0.35rem 0.4rem 0.1rem;
  -webkit-overflow-scrolling: touch;
}

.iso-chart {
  display: block;
  width: 100%;
  height: auto;
}

.grid-cell {
  fill: #ebedf0;
}

.bar-top,
.bar-side {
  stroke: none;
}

.bar-top.level-1 { fill: #9be9a8; }
.bar-top.level-2 { fill: #40c463; }
.bar-top.level-3 { fill: #30a14e; }
.bar-top.level-4 { fill: #216e39; }

.bar-side--left.level-1 { fill: #6fbf82; }
.bar-side--left.level-2 { fill: #2f9e4b; }
.bar-side--left.level-3 { fill: #257f3e; }
.bar-side--left.level-4 { fill: #18542c; }

.bar-side--right.level-1 { fill: #84d696; }
.bar-side--right.level-2 { fill: #36b457; }
.bar-side--right.level-3 { fill: #2a9148; }
.bar-side--right.level-4 { fill: #1d6234; }

.calendar-scroll {
  overflow-x: auto;
  padding-bottom: 0.25rem;
  -webkit-overflow-scrolling: touch;

  &.is-loading {
    opacity: 0.55;
  }
}

.calendar-layout {
  width: max-content;
  min-width: 100%;
}

.calendar-months {
  position: relative;
  height: 15px;
  margin-left: 2.15rem;
}

.month-label {
  position: absolute;
  top: 0;
  overflow: hidden;
  font-size: 0.65rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.calendar-body {
  display: flex;
  gap: 0.35rem;
}

.weekday-labels {
  display: grid;
  grid-template-rows: repeat(7, 11px);
  gap: 3px;
  width: 1.8rem;
  font-size: 0.62rem;
  color: var(--p-text-muted-color);
}

.weekday-label {
  align-self: center;

  &--mon { grid-row: 2; }
  &--wed { grid-row: 4; }
  &--fri { grid-row: 6; }
}

.weeks {
  display: flex;
  gap: 3px;
}

.week {
  display: grid;
  grid-template-rows: repeat(7, 11px);
  gap: 3px;
}

.day {
  display: block;
  width: 11px;
  height: 11px;
  border-radius: 2px;
  background: #ebedf0;

  &.level-1 { background: #9be9a8; }
  &.level-2 { background: #40c463; }
  &.level-3 { background: #30a14e; }
  &.level-4 { background: #216e39; }

  &.is-empty {
    visibility: hidden;
  }
}

.contribution-state {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.contribution-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.68rem;
  color: var(--p-text-muted-color);
}

.contribution-note {
  min-width: 0;
}

.legend {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 3px;
}

.legend-day {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: #ebedf0;

  &.level-1 { background: #9be9a8; }
  &.level-2 { background: #40c463; }
  &.level-3 { background: #30a14e; }
  &.level-4 { background: #216e39; }
}

@media (prefers-color-scheme: dark) {
  .grid-cell,
  .day,
  .legend-day {
    background: #161b22;
  }

  .grid-cell {
    fill: #161b22;
    background: none;
  }

  .day,
  .legend-day {
    &.level-1 { background: #0e4429; }
    &.level-2 { background: #006d32; }
    &.level-3 { background: #26a641; }
    &.level-4 { background: #39d353; }
  }

  .bar-top.level-1 { fill: #0e4429; }
  .bar-top.level-2 { fill: #006d32; }
  .bar-top.level-3 { fill: #26a641; }
  .bar-top.level-4 { fill: #39d353; }

  .bar-side--left.level-1 { fill: #0a3320; }
  .bar-side--left.level-2 { fill: #005226; }
  .bar-side--left.level-3 { fill: #1c8033; }
  .bar-side--left.level-4 { fill: #2ba63f; }

  .bar-side--right.level-1 { fill: #0c3d25; }
  .bar-side--right.level-2 { fill: #00602d; }
  .bar-side--right.level-3 { fill: #21943a; }
  .bar-side--right.level-4 { fill: #32bc4a; }
}

@media (max-width: 700px) {
  .contribution-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .streak-row {
    grid-template-columns: 1fr;
  }

  .contribution-foot {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  .contribution-card {
    padding: 0.85rem;
  }

  .contribution-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
