<script setup lang="ts">
import type { Ref } from 'vue';

import { nextTick, onMounted, ref, watch } from 'vue';

import Vditor from 'vditor';

import 'vditor/dist/index.css';

interface UploadOptions {
  url: string;
  format?: (files: File[]) => {
    body: FormData;
    headers?: Record<string, unknown>;
  };
  handler?: (response: any) => string;
}

interface PluginOption {
  name: string;
  icon: string;
  tip: string;
  click: (editor: any) => void;
  after?: (editor: any) => void; // 添加 after 支持
}

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: [Number, String], default: 400 },
  toolbar: {
    type: Array as () => (Record<string, any> | string)[],
    default: () => [
      'undo', // 撤销
      'redo', // 重做
      // 'fullscreen', // 全屏
      '|',
      'emoji', // 表情
      'headings', // 标题
      '|', // 分隔符
      'bold', // 粗体
      'italic', // 斜体
      'strike', // 删除线
      'quote', // 引用块（blockquote）
      '|',
      'list', // 无序列表
      'ordered-list', // 有序列表
      'check', // 任务列表（复选框）
      '|',
      'link', // 链接
      'upload', // 图片上传（拖拽/选择文件）
      'table', // 表格
      'line', // 分割线

      // 'info', // 信息面板
      // 'help', // 帮助
    ],
  },
  uploadOptions: {
    type: Object as () => UploadOptions,
    default: () => ({ url: '' }),
  },
  previewMode: { type: Boolean, default: false },
  plugins: { type: Array as () => PluginOption[], default: () => [] },
  options: { type: Object as () => Object, default: () => ({}) },
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const editorContainer: Ref<HTMLElement | null> = ref(null);
let vditor: any = null;
const isReady: Ref<boolean> = ref(false);

const scrollToCursor: () => void = () => {
  if (!vditor) return;
  nextTick(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = editorContainer.value?.querySelector(
      '.vditor-wysiwyg',
    ) as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    if (rect.bottom > containerRect.bottom || rect.top < containerRect.top) {
      container.scrollTop += rect.top - containerRect.top - 40; // 留点偏移
    }
  });
};

onMounted(() => {
  if (!editorContainer.value) return;

  const pluginItems = props.plugins.map((plugin: PluginOption) => ({
    name: plugin.name,
    icon: plugin.icon,
    tip: plugin.tip,
    click: () => plugin.click(vditor),
  }));

  const toolbar = [...props.toolbar, ...pluginItems];

  const config: any = {
    value: props.modelValue,
    height: Number(props.height),
    toolbar,
    cache: { enable: false },
    upload: props.uploadOptions.url
      ? {
          url: props.uploadOptions.url,
          format: props.uploadOptions.format,
          handler: props.uploadOptions.handler,
        }
      : undefined,
    mode: props.previewMode ? 'sv' : 'wysiwyg',
    input: (value: string) => {
      emit('update:modelValue', value);
      scrollToCursor();
    },
    after: () => {
      isReady.value = true;
      scrollToCursor();
      // 如果插件还定义了初始化逻辑，则执行
      props.plugins.forEach((plugin) => {
        plugin.after?.(vditor);
      });
    },
    ...props.options,
  };

  vditor = new Vditor(editorContainer.value, config);
});

watch(
  () => props.modelValue,
  (val) => {
    if (vditor && val !== vditor.getValue()) {
      vditor.setValue(val);
    }
  },
);

watch(
  () => props.previewMode,
  (preview) => {
    if (isReady.value && vditor?.setMode) {
      vditor.setMode(preview ? 'sv' : 'wysiwyg');
    }
  },
);

defineExpose({ vditor });
</script>

<template>
  <div ref="editorContainer" v-bind="$attrs"></div>
</template>
