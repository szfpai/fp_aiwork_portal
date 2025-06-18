<script setup lang="ts">
import { reactive, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { Input } from 'ant-design-vue';

import Editor from '#/components/Editor/inedex.vue';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void;
}>();

const state = reactive({
  title: props.modelValue?.title ?? '',
  content: props.modelValue?.content ?? '',
});

watch(
  () => [state.content, state.title],
  useDebounceFn(() => {
    emit('update:modelValue', state);
  }, 300),
);
</script>
<template>
  <div class="my-[16px] flex flex-col" :class="$style.editor_container">
    <Editor
      editor-class="!h-[266px] order-3"
      toolbar-class="order-1 border-b border-t border-color-[#eee]"
      v-model="state.content"
    >
      <Input
        placeholder="请输入标题"
        v-model:value="state.title"
        class="order-2 mt-[16px] border-none text-[24px] font-bold outline-none !transition-none placeholder:text-[#8e8f99] focus:border-none focus:ring-0"
      />
    </Editor>
  </div>
</template>
<style lang="less" module>
.editor_container {
  :global {
    .w-e-text-container {
      margin-top: -8px;
      .w-e-text-placeholder {
        font-size: 17px;
        color: #aeb5bd;
      }
    }
    .w-e-bar-item {
      .disabled {
        color: #595959 !important;
        & > svg {
          fill: #595959 !important;
        }
      }
    }
  }
}
</style>
