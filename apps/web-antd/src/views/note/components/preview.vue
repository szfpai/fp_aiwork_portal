<script setup lang="ts">
import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import renderHtml from '#/components/Markdown/rederMardown.vue';
import useMarkdownConverter from '#/hooks/useMarkdownConverter';
import { calcZIndex, delay } from '#/utils';

defineOptions({
  name: 'NotePrew',
});

const mardown = ref<string>('');
const { markdownToHtml } = useMarkdownConverter();

const [Preview, previewApi] = useVbenDrawer({
  onCancel() {
    previewApi.setData({});
    previewApi.close();
  },
  onOpenChange: async (isOpen: boolean) => {
    if (isOpen) {
      const { title, url } = previewApi.getData();
      previewApi.setState({
        title: title ? title.replace(/\.md$/, '') : '文件预览',
      });
      try {
        previewApi.lock();
        mardown.value = '';
        const res = await fetch(`${import.meta.env.VITE_GLOB_API_URL}${url}`);
        if (!res.ok) throw new Error('获取 Markdown 文件失败');
        const result = await res.text();
        await delay(1000);
        mardown.value = markdownToHtml(result) as string;
      } catch (error) {
        console.warn(error);
      } finally {
        previewApi.unlock();
      }
    }
  },
});
</script>

<template>
  <Preview
    :close-on-press-escape="false"
    :footer="false"
    :z-index="calcZIndex()"
    :class="$style.preview"
  >
    <renderHtml :content="mardown" />
  </Preview>
</template>
<style lang="less" module>
.preview {
  :global {
  }
}
</style>
