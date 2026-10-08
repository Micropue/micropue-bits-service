<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type CSSProperties, type ComponentPublicInstance } from 'vue';

export interface DriftWallItem {
  image: string;
  title?: string;
  href?: string;
}

interface DriftWallProps {
  items?: DriftWallItem[];
  columns?: number;
  tileWidth?: number;
  tileHeight?: number;
  gap?: number;
  radius?: number;
  tilt?: number;
  turn?: number;
  roll?: number;
  perspective?: number;
  depth?: number;
  speed?: number;
  direction?: 'up' | 'down';
  variance?: number;
  parallax?: number;
  pauseOnHover?: boolean;
  lift?: number;
  fade?: number;
  dim?: number;
  grayscale?: boolean;
  overlayColor?: string;
  className?: string;
  style?: CSSProperties;
}

interface ColumnMeta {
  copyHeight: number;
  copies: number;
}

interface RenderTile {
  id: string;
  item: DriftWallItem;
}

interface RenderColumn {
  column: number;
  tiles: RenderTile[];
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const columnFactor = (index: number, variance: number): number => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
  return 1 + variance * pseudo;
};

const emit = defineEmits<{ ready: [] }>()

const props = withDefaults(defineProps<DriftWallProps>(), {
  items: () =>
    Array.from({ length: 15 }, (_, i) => {
      const ids = [1015, 1025, 1039, 1043, 1044, 1050, 1062, 1069, 1074, 1080, 1084, 106, 110, 133, 164];
      return {
        image: `https://picsum.photos/id/${ids[i % ids.length]}/600/400`,
        title: `Tile ${i + 1}`,
        href: undefined
      };
    }),
  columns: 5,
  tileWidth: 200,
  tileHeight: 132,
  gap: 18,
  radius: 14,
  tilt: 16,
  turn: -14,
  roll: 0,
  perspective: 1200,
  depth: 120,
  speed: 42,
  direction: 'up',
  variance: 0.45,
  parallax: 0.6,
  pauseOnHover: false,
  lift: 64,
  fade: 0.6,
  dim: 0.55,
  grayscale: false,
  overlayColor: '#060010',
  className: ''
});

const containerRef = ref<HTMLDivElement | null>(null);
const planeRef = ref<HTMLDivElement | null>(null);
const trackRefs = ref<(HTMLDivElement | null)[]>([]);

const setTrackRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  trackRefs.value[index] = el as HTMLDivElement | null;
};

const containerHeight = ref(600);
const activeId = ref<string | null>(null);
const reduced = ref(false);

let offsets: number[] = [];
let velocities: number[] = [];
let hoveredCol = -1;
let wallHovered = false;
const pointer = { x: 0, y: 0 };
const pointerDamped = { x: 0, y: 0 };
let lastTs: number | null = null;
let raf: number | null = null;

const columnItems = computed<DriftWallItem[][]>(() => {
  const cols: DriftWallItem[][] = Array.from({ length: props.columns }, () => []);
  props.items.forEach((item, i) => cols[i % props.columns].push(item));
  return cols.map(col => (col.length ? col : props.items.slice(0, 1)));
});

// 背景“可正常显示”的判定：按 URL 去重统计加载完成的图片（同一张图的多个副本只算一次），
// 达到简单多数（60%）即视为可展示，不等待全部加载；加载失败也计入，避免永远卡在加载态
const settledUrls = new Set<string>();
const uniqueImageCount = computed(() => new Set(props.items.map(item => item.image)).size);
let readyEmitted = false;
let readyTimer: ReturnType<typeof setTimeout> | null = null;

const emitReady = () => {
  if (readyEmitted) return;
  readyEmitted = true;
  if (readyTimer) {
    clearTimeout(readyTimer);
    readyTimer = null;
  }
  emit('ready');
};

const markSettled = (url: string) => {
  if (readyEmitted || settledUrls.has(url)) return;
  settledUrls.add(url);
  const threshold = Math.max(1, Math.ceil(uniqueImageCount.value * 0.6));
  if (settledUrls.size >= threshold) emitReady();
};

const columnMeta = computed<ColumnMeta[]>(() => {
  const unit = props.tileHeight + props.gap;
  return columnItems.value.map(col => {
    const copyHeight = Math.max(unit, col.length * unit);
    const copies = Math.max(2, Math.ceil((containerHeight.value * 3) / copyHeight) + 2);
    return { copyHeight, copies };
  });
});

const baseVelocities = computed<number[]>(() => {
  const dirSign = props.direction === 'up' ? 1 : -1;
  return columnItems.value.map((_, c) => {
    const altSign = c % 2 === 0 ? 1 : -1;
    return props.speed * columnFactor(c, props.variance) * dirSign * altSign;
  });
});

const renderColumns = computed<RenderColumn[]>(() =>
  columnItems.value.map((col, c) => {
    const meta = columnMeta.value[c];
    const copyCount = meta ? meta.copies : 0;
    const tiles: RenderTile[] = [];
    for (let copyIndex = 0; copyIndex < copyCount; copyIndex++) {
      col.forEach((item, itemIndex) => {
        tiles.push({ id: `${c}-${copyIndex}-${itemIndex}`, item });
      });
    }
    return { column: c, tiles };
  })
);

watch(
  () => [columnMeta.value, columnItems.value],
  () => {
    offsets = columnMeta.value.map((meta, c) => meta.copyHeight * ((c * 0.37) % 1));
    velocities = columnItems.value.map(() => 0);
  },
  { immediate: true }
);

const applyPlaneTransform = (px: number, py: number) => {
  const plane = planeRef.value;
  if (!plane) return;
  plane.style.transform =
    `translate(-50%, -50%) scale(1.18) ` +
    `rotateX(${props.tilt + py}deg) rotateY(${props.turn + px}deg) rotateZ(${props.roll}deg) ` +
    `translateZ(${-props.depth}px)`;
};

const animate = (ts: number) => {
  if (lastTs === null) lastTs = ts;
  const dt = Math.min(0.05, Math.max(0, ts - lastTs) / 1000);
  lastTs = ts;

  const maxTilt = props.parallax * 8;
  const targetX = pointer.x * maxTilt;
  const targetY = -pointer.y * maxTilt;
  const damp = 1 - Math.exp(-dt / 0.12);
  pointerDamped.x += (targetX - pointerDamped.x) * damp;
  pointerDamped.y += (targetY - pointerDamped.y) * damp;
  applyPlaneTransform(pointerDamped.x, pointerDamped.y);

  if (!reduced.value) {
    for (let c = 0; c < trackRefs.value.length; c++) {
      const meta = columnMeta.value[c];
      if (!meta) continue;
      const paused = wallHovered && props.pauseOnHover;
      const factor = paused || hoveredCol === c ? 0 : 1;
      const target = baseVelocities.value[c] * factor;

      const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
      velocities[c] += (target - velocities[c]) * ease;
      let next = (offsets[c] ?? 0) + velocities[c] * dt;
      next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
      offsets[c] = next;

      const el = trackRefs.value[c];
      if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`;
    }
  } else {
    for (let c = 0; c < trackRefs.value.length; c++) {
      const el = trackRefs.value[c];
      const meta = columnMeta.value[c];
      if (el && meta) el.style.transform = `translate3d(0, ${-(offsets[c] ?? 0)}px, 0)`;
    }
  }

  raf = requestAnimationFrame(animate);
};

const activate = (id: string, index: number) => {
  hoveredCol = index;
  activeId.value = id;
};

const release = () => {
  hoveredCol = -1;
  activeId.value = null;
};

const handlePointerMove = (e: PointerEvent) => {
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;
  if (props.parallax > 0 && !reduced.value) {
    pointer.x = (e.clientX - rect.left) / rect.width - 0.5;
    pointer.y = (e.clientY - rect.top) / rect.height - 0.5;
  }
  const hit = document.elementFromPoint(e.clientX, e.clientY);
  const tile = hit && hit.closest ? (hit.closest('[data-tile-id]') as HTMLElement | null) : null;
  if (!tile) return;
  const id = tile.dataset.tileId ?? null;
  if (id === activeId.value) return;
  hoveredCol = Number(tile.dataset.col);
  activeId.value = id;
};

const handlePointerEnter = () => {
  wallHovered = true;
};

const handlePointerLeaveWall = () => {
  wallHovered = false;
  pointer.x = 0;
  pointer.y = 0;
  release();
};

let mq: MediaQueryList | null = null;
let onReducedChange: ((e: MediaQueryListEvent) => void) | null = null;
let ro: ResizeObserver | null = null;

onMounted(() => {
  // 兜底：图片迟迟未加载（网络差/懒加载未触发）时也放开页面
  readyTimer = setTimeout(emitReady, 8000);

  // SSR 输出的 <img> 在挂载前就可能已加载完（如缓存命中），不会再触发 load 事件，这里补记
  containerRef.value?.querySelectorAll<HTMLImageElement>('img.dw-tile-img').forEach(img => {
    if (img.complete) markSettled(img.getAttribute('src') ?? img.src);
  });

  reduced.value = prefersReducedMotion();
  if (typeof window !== 'undefined') {
    mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    onReducedChange = e => {
      reduced.value = e.matches;
    };
    mq.addEventListener('change', onReducedChange);
  }

  const el = containerRef.value;
  if (el) {
    ro = new ResizeObserver(([entry]) => {
      containerHeight.value = entry.contentRect.height || 600;
    });
    ro.observe(el);
  }

  raf = requestAnimationFrame(animate);
});

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  lastTs = null;
  if (readyTimer) {
    clearTimeout(readyTimer);
    readyTimer = null;
  }
  ro?.disconnect();
  if (mq && onReducedChange) mq.removeEventListener('change', onReducedChange);
});

const maskStyle =
  'radial-gradient(ellipse 78% 82% at 50% 46%, #000 var(--dw-edge), transparent 100%), ' +
  'linear-gradient(to top, #000 var(--dw-edge), transparent 100%)';

const cssVars = computed<CSSProperties>(
  () =>
    ({
      '--dw-tile-w': `${props.tileWidth}px`,
      '--dw-tile-h': `${props.tileHeight}px`,
      '--dw-gap': `${props.gap}px`,
      '--dw-radius': `${props.radius}px`,
      '--dw-lift': `${props.lift}px`,
      '--dw-dim': props.dim,
      '--dw-gray': props.grayscale ? 1 : 0,
      '--dw-overlay': props.overlayColor,
      '--dw-edge': `${Math.max(0, (1 - props.fade) * 100)}%`,
      perspective: `${props.perspective}px`,
      perspectiveOrigin: '50% 50%',
      WebkitMaskImage: maskStyle,
      maskImage: maskStyle,
      WebkitMaskComposite: 'source-in',
      maskComposite: 'intersect',
      ...(props.style || {})
    }) as CSSProperties
);
</script>

<template>
  <div
    ref="containerRef"
    class="dw-root"
    :class="className"
    :style="cssVars"
    role="group"
    aria-label="Drifting wall of tiles"
    @pointermove="handlePointerMove"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeaveWall"
  >
    <div ref="planeRef" class="dw-plane">
      <div v-for="colData in renderColumns" :key="`col-${colData.column}`" class="dw-col">
        <div
          :ref="(el: Element | ComponentPublicInstance | null) => setTrackRef(el, colData.column)"
          class="dw-track"
        >
          <component
            :is="tile.item.href ? 'a' : 'div'"
            v-for="tile in colData.tiles"
            :key="tile.id"
            :href="tile.item.href"
            :target="tile.item.href ? '_blank' : undefined"
            :rel="tile.item.href ? 'noreferrer noopener' : undefined"
            :tabindex="tile.item.href ? undefined : 0"
            :role="tile.item.href ? undefined : 'button'"
            :aria-label="tile.item.href ? undefined : (tile.item.title ?? 'tile')"
            :class="['dw-tile', activeId === tile.id ? 'is-active' : '']"
            :data-tile-id="tile.id"
            :data-col="colData.column"
            @focus="activate(tile.id, colData.column)"
            @blur="release"
          >
            <span class="dw-tile-inner">
              <img
                :src="tile.item.image"
                :alt="tile.item.title ?? ''"
                loading="lazy"
                decoding="async"
                :draggable="false"
                class="dw-tile-img"
                @load="markSettled(tile.item.image)"
                @error="markSettled(tile.item.image)"
              />
              <span class="dw-tile-overlay" aria-hidden="true" />
            </span>
          </component>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dw-root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.dw-plane {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: row;
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  cursor: pointer;
  will-change: transform;
}

.dw-col {
  position: relative;
  width: calc(var(--dw-tile-w) + var(--dw-gap));
  transform-style: preserve-3d;
}

.dw-track {
  display: flex;
  flex-direction: column;
  transform-style: preserve-3d;
  will-change: transform;
}

.dw-tile {
  position: relative;
  display: block;
  flex: none;
  width: 100%;
  height: calc(var(--dw-tile-h) + var(--dw-gap));
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
}

.dw-tile-inner {
  pointer-events: none;
  position: absolute;
  inset: calc(var(--dw-gap) / 2);
  display: block;
  overflow: hidden;
  background: #0b0b12;
  border-radius: var(--dw-radius);
  opacity: var(--dw-dim);
  transform: translateZ(0);
  transition:
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dw-tile-img {
  display: block;
  height: 100%;
  width: 100%;
  user-select: none;
  object-fit: cover;
  filter: grayscale(var(--dw-gray)) saturate(0.92);
  transition: filter 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dw-tile-overlay {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: var(--dw-overlay);
  opacity: 0.42;
  transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dw-tile.is-active .dw-tile-inner,
.dw-tile:focus-visible .dw-tile-inner {
  opacity: 1;
  transform: translateZ(var(--dw-lift));
  box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.7);
}

.dw-tile:focus-visible .dw-tile-inner {
  box-shadow:
    0 24px 60px -18px rgba(0, 0, 0, 0.7),
    0 0 0 2px rgba(255, 255, 255, 0.9);
}

.dw-tile.is-active .dw-tile-img,
.dw-tile:focus-visible .dw-tile-img {
  filter: grayscale(0) saturate(1.05);
}

.dw-tile.is-active .dw-tile-overlay,
.dw-tile:focus-visible .dw-tile-overlay {
  opacity: 0;
}
</style>
