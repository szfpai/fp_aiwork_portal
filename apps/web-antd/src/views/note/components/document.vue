<script setup lang="ts">
import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';

import { useVbenForm } from '#/adapter/form';
import { editNote } from '#/api';
import useMarkdownConverter from '#/hooks/useMarkdownConverter';

import { noteSchema } from '../config';

const { markdownToHtml, htmlToMarkdown } = useMarkdownConverter();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  schema: noteSchema,
  // handleSubmit: onSubmit,
});

const [ModalForm, modalApi] = useVbenModal({
  centered: true,
  bordered: false,
  fullscreenButton: false,
  closeOnClickModal: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    try {
      const { row, doc_id, noteId, refresh } = modalApi.getData();
      if (isEmpty(row) || !doc_id || !noteId || !isFunction(refresh)) return;
      const values = await formApi.validateAndSubmitForm();
      if (!values) return;
      modalApi.lock();
      await editNote(noteId, {
        title: values.title,
        doc_id,
        content: htmlToMarkdown(values.content),
      });
      message.success('编辑成功');
      isFunction(refresh) && refresh();
      modalApi.close();
    } catch (error) {
      console.warn('🚀 ~ onConfirm ~ error:', error);
    } finally {
      modalApi.unlock();
    }
  },
  title: '编辑文件',
  onOpenChange: async (isOpen: boolean) => {
    try {
      !isOpen && modalApi.setData({});
      if (isOpen) {
        const { row, doc_id, noteId, refresh } = modalApi.getData();
        if (isEmpty(row) || !doc_id || !noteId || !isFunction(refresh)) return;
        modalApi.lock();
        const url = `${import.meta.env.VITE_GLOB_API_URL}${row?.file?.url}`;
        const title = row?.file?.name?.replace(/\.md$/, '') ?? '';
        const res = await fetch(url);
        if (!res.ok) throw new Error('获取 Markdown 文件失败');
        const result = await res.text();
        const content = markdownToHtml(result) as string;
        formApi.setValues({
          title,
          content,
        });
      }
    } catch (error) {
      console.warn('🚀 ~ onOpenChange ~ error:', error);
    } finally {
      modalApi.unlock();
    }
  },
});

function onSubmit(values: Record<string, any>) {
  console.warn('🚀 ~ onSubmit ~ values:', values);
  modalApi.lock();
  setTimeout(() => {
    modalApi.close();
  }, 2000);
}
</script>

<template>
  <ModalForm class="w-[600px]" :class="$style.container">
    <Form class="px-[0.5rem]" />
  </ModalForm>
</template>
<style lang="less" module>
.container {
  :global {
    .w-e-text-container [data-slate-editor] p {
      margin: 0 !important;
    }
    .w-e-text-placeholder {
      top: 5px !important;
    }
  }
}
</style>
