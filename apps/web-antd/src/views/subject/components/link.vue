<script setup lang="ts">
import { reactive, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { Input } from 'ant-design-vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const state = reactive({
  link: props.modelValue ?? '',
});

watch(
  () => state.link,
  useDebounceFn(() => {
    emit('update:modelValue', state.link);
  }, 300),
);
</script>
<template>
  <div class="pt-[24px]" :class="$style.container">
    <Input
      v-model:value="state.link"
      size="large"
      placeholder="粘贴或者输入链接"
      class="mb-[24px] w-full"
    >
      <template #prefix>
        <span class="icon-[line-md--link]"></span>
      </template>
    </Input>
    <!-- <Input
      size="large"
      placeholder="整理这条链接的核心内容"
      class="mb-[24px] w-full"
    >
      <template #prefix>
        <span class="icon-[lucide--square-dashed-bottom-code]"></span>
      </template>
    </Input>
    <ul class="text-[14px] text-[#677084]">
      <li class="mb-[12px] before:mr-[6px] before:content-['•']">
        支持公众号文章、公开网站链接
      </li>
      <li class="mb-[12px] before:mr-[6px] before:content-['•']">
        支持抖音、小红书、B站短视频和得到App直播回放链接
      </li>
      <li class="mb-[18px] before:mr-[6px] before:content-['•']">
        补充信息可以帮助AI更好地理解 如何粘贴链接总结生成笔记？
      </li>
      <a class="block cursor-pointer text-[#5182ff]">
        如何粘贴链接总结生成笔记？
      </a>
    </ul> -->
  </div>
</template>
<style lang="less" module>
.container {
  :global {
    .ant-input {
      &::placeholder {
        color: #8a8f99;
      }
    }
  }
}
</style>
