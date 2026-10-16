<template>
  <div class="console-otp" :class="`console-otp--${boxCount}`">
    <InputOtp :model-value="modelValue" :length="length" :integer-only="integerOnly" :disabled="disabled"
      :aria-label="ariaLabel" @update:model-value="$emit('update:modelValue', $event)">
      <template #default="{ attrs, events, index }">
        <input v-bind="attrs" v-on="events" class="p-inputtext p-inputotp-input" type="text" maxlength="1"
          :inputmode="integerOnly ? 'numeric' : 'text'" :id="`${idPrefix}-${index}`"
          :name="`${idPrefix}-${index}`" :aria-label="boxLabel(index)" autocomplete="off" autocapitalize="off"
          spellcheck="false">
      </template>
    </InputOtp>
  </div>
</template>

<script setup lang="ts">
// 控制台验证码输入：逐格原生 input（每个格子都有 id / name / aria-label）
// columns 决定每行几格（64 位登录码 16 格一行、身份确认码 8 格一行、6 位码一行 6 格），
// 尺寸按各自容器宽度算好，保证每行格数固定、每 4 格一组的间隔在各行对齐
const props = defineProps<{
  modelValue: string
  length?: number
  columns?: number
  integerOnly?: boolean
  disabled?: boolean
  idPrefix: string
  /** 单格无障碍标签模板，用 {index} / {length} 占位，便于中英文切换 */
  labelTemplate: string
  ariaLabel: string
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()

// 6 位码与其它长度分开给样式（6 位单行、不分组）
const boxCount = computed(() => (props.length === 6 ? 6 : (props.columns ?? 16)))

function boxLabel(index: number) {
  return props.labelTemplate
    .replace(/\{index\}/g, String(index))
    .replace(/\{length\}/g, String(props.length ?? 64))
}
</script>

<style lang="scss" scoped>
.console-otp {
  display: flex;
  justify-content: flex-start;

  :deep(.p-inputotp) {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    width: 100%;
  }

  :deep(.p-inputotp-input) {
    flex: 0 0 auto;
    padding: 0;
    text-align: center;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  /* 16 格一行（64 位登录码） */
  &--16 :deep(.p-inputotp) {
    column-gap: 0.24rem;
    row-gap: 0.3rem;
  }

  &--16 :deep(.p-inputotp-input) {
    width: 1.52rem;
    height: 1.95rem;
    font-size: 0.78rem;
  }

  &--16 :deep(.p-inputotp-input:nth-child(4n)) {
    margin-right: 0.4rem;
  }

  /* 8 格一行（身份确认码）：用 grid 保证每行正好 8 格、等宽铺满弹窗 */
  &--8 :deep(.p-inputotp) {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    column-gap: 0.35rem;
    row-gap: 0.35rem;
    width: 100%;
  }

  &--8 :deep(.p-inputotp-input) {
    width: 100%;
    height: 2.4rem;
    font-size: 0.95rem;
  }

  /* 6 位码：单行大格，不分组 */
  &--6 :deep(.p-inputotp) {
    width: auto;
    column-gap: 0.35rem;
  }

  &--6 :deep(.p-inputotp-input) {
    width: 2.4rem;
    height: 2.6rem;
    font-size: 1.05rem;
  }
}
</style>
