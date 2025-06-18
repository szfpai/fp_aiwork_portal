<script setup lang="ts">
import { nextTick, ref } from 'vue';

import { message, UploadDragger } from 'ant-design-vue';

const props = defineProps<{
  maxSize?: number;
  tips?: string;
}>();

const emit = defineEmits<{
  (e: 'upload', file: File): void;
}>();

const uploadRef = ref<any>();

function customRequest({ file }: any) {
  emit('upload', file);
  nextTick(() => clearUploadFiles());
}

function beforeUpload(file: File) {
  const isLt200M = file.size / 1024 / 1024 < (props.maxSize ?? 200);
  if (!isLt200M) {
    message.error(`文件大小不能超过 ${props.maxSize ?? 200}MB!`);
    return false;
  }
  return true;
}

// 清空上传文件
function clearUploadFiles() {
  uploadRef.value?.clearFiles?.();
}
</script>
<template>
  <UploadDragger
    ref="uploadRef"
    :multiple="true"
    :before-upload="beforeUpload"
    :custom-request="customRequest"
    :show-upload-list="false"
    v-bind="$attrs"
  >
    <slot name="default" v-if="$slots.default"></slot>
    <div class="p-[14px]" v-else>
      <div class="text-center">
        <span class="icon-[ion--cloud-upload-outline] text-[40px]"></span>
        <div class="text-[14px] text-[#292d34]">
          <span>将文件拖动到此处或</span>
          <span class="text-[#ff6a41]">点击上传</span>
        </div>
        <div class="text-[#8a8f99]">
          <div class="my-[5px] text-[12px]">
            支持上传 {{ tips ?? 'PDF、DOC、DOCX、PPT、PPTX' }} 文件类型
          </div>
          <div class="text-[12px]">
            单个文件大小不超过 {{ maxSize ?? 200 }}MB
          </div>
        </div>
      </div>
    </div>
  </UploadDragger>
</template>
