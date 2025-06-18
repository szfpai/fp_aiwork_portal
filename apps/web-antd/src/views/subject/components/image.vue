<script setup lang="ts">
import Upload from './upload.vue';

const emit = defineEmits<{
  (e: 'upload', file: File): void;
}>();

const hanldeUpload = (file: File) => {
  emit('upload', file);
};
</script>

<template>
  <div class="pt-[24px]" :class="$style.container">
    <Upload
      class="!h-[180px]"
      @upload="hanldeUpload"
      :accept="['image/jpg', 'image/jpeg', 'image/png', 'image/gif']"
      tips="JPG、JPEG、PNG、GIF"
      :max-size="10"
    />
    <!-- <Input
      size="large"
      placeholder="整理这张图片的核心内容"
      class="my-[24px] w-full"
    >
      <template #prefix>
        <span class="icon-[lucide--square-dashed-bottom-code]"></span>
      </template>
    </Input>
    <div class="mb-[24px] text-[14px] text-[#677084]">
      <span class="mr-[12px]">•</span>
      <span>补充信息可以帮助AI更好地理解</span>
    </div> -->
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
