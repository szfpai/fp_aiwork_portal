<script lang="ts" setup>
import { onMounted, shallowRef, unref, watch } from 'vue';

import Cherry from 'cherry-markdown';
import CherryMermaidPlugin from 'cherry-markdown/dist/addons/cherry-code-block-mermaid-plugin';
import mermaid from 'mermaid';
import { v4 as uuidv4 } from 'uuid';

import defaultConfig from '#/utils/Cherry.config';

import 'cherry-markdown/dist/cherry-markdown.css';

const props = defineProps<{
  configs?: { default: () => Record<string, any>; type: Object };
  modelValue: { default: ''; type: String };
  plugins?: Array<{ options?: Record<string, any>; plugin: any }>;
}>();

const emit = defineEmits(['update:modelValue']);

const cherryInstance = shallowRef<Cherry>();

props.plugins?.forEach((item: any) => {
  Cherry.usePlugin(item.plugin, item.options);
});

const uuid = uuidv4().replaceAll('-', '');

// 插件注册必须在Cherry实例化之前完成
Cherry.usePlugin(CherryMermaidPlugin, {
  mermaid, // 传入mermaid引用
  // mermaidAPI: mermaid.mermaidAPI, // 也可以传入mermaid API
  // 同时可以在这里配置mermaid的行为，可参考mermaid官方文档
  // theme: 'neutral',
  // sequence: { useMaxWidth: false, showSequenceNumbers: true }
});

const updateModelValue = () => {
  const markdown = cherryInstance.value?.getMarkdown();
  emit('update:modelValue', markdown);
};

watch(
  () => props.modelValue,
  (newVal) => {
    if (unref(cherryInstance) && typeof newVal === 'string') {
      unref(cherryInstance)?.setMarkdown(newVal, true); // 第二个参数表示是否自动渲染
    }
  },
);

onMounted(() => {
  cherryInstance.value = new Cherry({
    id: uuid,
    locale: 'zh_CN', // 支持多语言
    value: props.modelValue,
    isPreviewOnly: false,
    callback: {
      afterAsyncRender: (md: string, html: string) => {
        // md 是 markdown 源码，html 是渲染结果
      },
      afterChange: updateModelValue,
    },
    ...defaultConfig,
    ...props.configs,
  });
  console.log('🚀 ~ onMounted ~ props.modelValue:', cherryInstance.value);
});

defineExpose({
  cherry: unref(cherryInstance),
});
</script>
<template>
  <div :id="uuid" v-bind="$attrs" class="z-9999"></div>
</template>
