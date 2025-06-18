<script setup lang="ts">
import { reactive, ref, unref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import { Button, message } from 'ant-design-vue';
import isFunction from 'lodash/isFunction';

import { createNote, uploadKbFile } from '#/api';
import useMarkdownConverter from '#/hooks/useMarkdownConverter';
import { useRxWorkerQueue } from '#/hooks/useRxWorkerQueuecopy';
import { delay } from '#/utils';

import DefaultView from './default.vue';
import ImageView from './image.vue';
import LinkView from './link.vue';
import SelectView from './select.vue';
import WriteView from './write.vue';

// 创建队列实例
const queue = useRxWorkerQueue('upload', 2);
const { htmlToMarkdown } = useMarkdownConverter();
const activeKey = ref('default');
const headerTitle = ref('');
const accessStore = useAccessStore();

const state = reactive({
  write: { title: '', content: '' },
  link: '',
  select: '',
});

const [Modal, modalApi] = useVbenModal({
  header: false,
  contentClass: '',
  centered: true,
  bordered: false,
  fullscreenButton: false,
  closeOnClickModal: true,
  showCancelButton: false,
  showConfirmButton: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    // modalApi.close();
    try {
      modalApi.lock();
      const { id, dpt_id, refresh } = modalApi.getData();
      if (!id || !dpt_id || !isFunction(refresh)) return;
      if (activeKey.value === 'write') {
        if (
          !state.write.title ||
          !state.write.content ||
          state.write.content === '<p><br></p>'
        ) {
          message.error('请输入标题或内容');
          return;
        }
        await createNote(id, {
          title: state.write.title,
          content: htmlToMarkdown(state.write.content),
        });
      }
      if (activeKey.value === 'link') {
        await hanldeUploadLink(id);
      }
      message.success('添加成功');
      refresh();
      modalApi.close();
    } catch (error) {
      console.warn('🚀 ~ onConfirm: ~ error:', error);
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange: (isOpen: boolean) => {
    if (isOpen) {
      activeKey.value = 'default';
      headerTitle.value = '添加文件';
      return;
    }
    state.write = { title: '', content: '' };
    state.link = '';
    state.select = '';
    modalApi.setData({});
  },
});

const handleAction = (item: any) => {
  activeKey.value = item.type;
  headerTitle.value = item.title;
};

const hanldeUpload = async (file: File) => {
  try {
    modalApi.lock();
    const arrayBuffer = await file.arrayBuffer();
    const { id } = modalApi.getData();
    if (['default', 'image'].includes(unref(activeKey))) {
      const payload = {
        id,
        data: { file: arrayBuffer, fileName: file.name, parse_now: true },
        headers: {
          Authorization: `Bearer ${accessStore.accessToken}`,
        },
      };
      /* modalApi.setData({ default: file });
      nextTick(() => modalApi.setData({}));
      modalApi?.close(); */
      await queue.enqueue(payload, {
        maxRetries: 0,
        // messageHandler: (e: any) => console.log('🚀 ~ messageHandler: ~ e:', e),
      });
      await delay(1000);
    }
  } catch (error) {
    console.warn('🚀 ~ hanldeUpload ~ error:', error);
  } finally {
    modalApi.unlock();
  }
};

const hanldeUploadLink = async (id: string) => {
  const regex =
    /\b((https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+(:\d+)?(\/[\w./?%&=#-]*)?)\b/gi;
  if (!regex.test(state.link)) {
    message.error('请输入正确的链接');
    throw new Error('请输入正确的链接');
  }
  try {
    const formData = new FormData();
    Object.entries({
      url: state.link,
      parse_now: true,
    }).forEach(([key, value]) => {
      formData.append(key, value?.toString() ?? '');
    });
    await uploadKbFile(id, formData);
    await delay(1000);
  } catch (error) {
    console.warn('🚀 ~ hanldeUploadLink ~ error:', error);
    throw error;
  }
};

queue.taskSubject.subscribe((task: any) => {
  if (['error'].includes(task?.status)) {
    message.error(task?.error ?? '上传失败');
  }
  if (['success'].includes(task?.status)) {
    message.success('上传成功');
    const { refresh } = modalApi.getData();
    modalApi.close();
    refresh();
  }
});

watch(
  () => activeKey.value,
  (newVal) => {
    if (newVal === 'default') {
      headerTitle.value = '添加文件';
    }
    modalApi.setState({
      showConfirmButton: ['image', 'link', 'select', 'write'].includes(newVal),
      showCancelButton: ['select'].includes(newVal),
    });
  },
  { immediate: true },
);
</script>

<template>
  <Modal class="w-[800px] px-[20px] py-[20px]" :class="$style.modal">
    <div class="relative" :class="{ 'text-center': activeKey !== 'default' }">
      <Button
        v-if="activeKey !== 'default'"
        @click="handleAction({ type: 'default' })"
        class="absolute bottom-[0px] left-[0px] flex items-center p-[12px]"
      >
        <span class="icon-[mdi--arrow-left] mr-[2px] text-[18px]"></span>
        返回
      </Button>
      <span class="text-[24px] font-medium text-[#111418]">{{
        headerTitle
      }}</span>
    </div>
    <div
      class="mb-[24px] mt-[15px] text-[14px] text-[#677084]"
      v-if="activeKey === 'default'"
    >
      添加文件内容后，AI 搜索会基于知识库中文件内容来回答。
    </div>
    <DefaultView
      v-if="activeKey === 'default'"
      @action="handleAction"
      @upload="hanldeUpload"
    />
    <ImageView v-if="activeKey === 'image'" @upload="hanldeUpload" />
    <LinkView v-if="activeKey === 'link'" v-model="state.link" />
    <SelectView v-if="activeKey === 'select'" v-model="state.select" />
    <WriteView v-if="activeKey === 'write'" v-model="state.write" />
  </Modal>
</template>

<style lang="less" module>
.modal {
  :global {
    .ant-upload-wrapper {
      .ant-upload-drag {
        border-radius: 20px;
        background-color: #f5f7fa;
        border: 2px dashed #adb3be;
      }
    }
  }
}
</style>
