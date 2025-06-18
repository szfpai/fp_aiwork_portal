<script setup lang="ts">
import { onMounted, watch } from 'vue';

import { v4 as uuidv4 } from 'uuid';
import Vditor from 'vditor';

import { delay } from '#/utils';

import 'vditor/dist/index.css';

const props = defineProps<{
  modelValue: string;
}>();

const containerId = uuidv4().replaceAll('-', '');

// 渲染 Markdown
const renderMarkdown = async () => {
  await delay(100);
  // eslint-disable-next-line unicorn/prefer-query-selector
  const container = document.getElementById(containerId) as HTMLDivElement;
  Vditor.preview(container, props.modelValue, {
    mode: 'light',
    hljs: { style: 'github' },
  });
};

// 初次挂载
onMounted(() => renderMarkdown);

// 内容更新时自动重新渲染
watch(
  () => props.modelValue,
  () => {
    renderMarkdown();
  },
  { immediate: true },
);
</script>

<template>
  <div
    :id="containerId"
    class="vditor-reset vditor-preview"
    :class="$style.vditor_preview"
  ></div>
</template>
<style lang="less" module>
.vditor_preview {
  margin-left: 12px;
  margin-top: 12px;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
    'Segoe UI Symbol', 'Noto Color Emoji';
  & > *:first-child {
    margin-top: 0;
  }
}
</style>
