<script setup lang="ts">
import { Col, Row } from 'ant-design-vue';

import { fileActionOptions } from '../configs';
import Upload from './upload.vue';

const emit = defineEmits<{
  (e: 'action', item: any): void;
  (e: 'upload', file: File): void;
}>();

const handleAction = (item: any) => {
  emit('action', item);
};

const hanldeUpload = (file: File) => {
  emit('upload', file);
};
</script>

<template>
  <Upload class="!h-[180px]" @upload="hanldeUpload" />
  <Row :gutter="[20, 20]" class="mt-[24px]">
    <Col
      :span="8"
      v-for="item in fileActionOptions"
      :key="item.icon"
      @click="handleAction(item)"
    >
      <div
        class="h-[94px] cursor-pointer rounded-[12px] border-[1px] border-[#e5e6ea] p-[12px]"
        :class="$style.card"
      >
        <div class="flex items-center text-[14px] font-medium text-[#111418]">
          <span class="mr-[6px] text-[18px]" :class="item.icon"></span>
          <span>{{ item.name }}</span>
        </div>
        <div class="mt-[12px] text-[12px] text-[#8a8f99]">
          {{ item.description }}
        </div>
      </div>
    </Col>
  </Row>
</template>

<style lang="less" module>
.card {
  &:hover {
    box-shadow:
      0px 4px 8px 0px rgba(0, 0, 0, 0.02),
      0px 8px 16px 0px rgba(161, 167, 181, 0.16);
  }
}
</style>
