<script setup lang="ts">
import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';
import isEmpty from 'lodash/isEmpty';

import { useVbenForm } from '#/adapter/form';
import { createSubject, updateSubject } from '#/api';

import { dirSchema } from '../configs';

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  schema: dirSchema,
  handleSubmit: onSubmit,
});

const [Modal, modalApi] = useVbenModal({
  contentClass: '',
  centered: true,
  bordered: false,
  fullscreenButton: false,
  closeOnClickModal: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    try {
      const { row = {}, refresh } = modalApi.getData();
      const values = await formApi.validateAndSubmitForm();
      if (!values) return;
      modalApi.lock();
      const actions = row?.id ? updateSubject : createSubject;
      await actions(row?.id ?? '', {
        ...row,
        ...values,
      });
      message.success('操作成功');
      refresh();
      modalApi.close();
    } catch (error) {
      console.warn('🚀 ~ onConfirm ~ error:', error);
    } finally {
      modalApi.unlock();
    }
  },
  title: '新建文件夹',
  onOpenChange: (isOpen: boolean) => {
    !isOpen && modalApi.setData({});
    if (isOpen) {
      const { row = {} } = modalApi.getData();
      modalApi.setState({ title: isEmpty(row) ? '新建文件夹' : '编辑' });
      if (!isEmpty(row)) {
        formApi.setValues({
          name: row?.name ?? '',
          description: row?.description ?? '',
        });
      }
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
  <Modal>
    <Form />
  </Modal>
</template>
