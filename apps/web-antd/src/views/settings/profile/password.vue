<script setup lang="ts">
import type { VbenFormSchema } from '@vben/common-ui';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm, z } from '#/adapter/form';

const schema: VbenFormSchema[] = [
  {
    component: 'InputPassword',
    componentProps: {
      placeholder: '请输入新密码',
      allowClear: true,
      size: 'large',
      maxLength: 256,
      required: true,
    },
    fieldName: 'oldPassword',
    label: '旧密码',
    rules: z.string().min(6, { message: '旧密码不能为空' }),
  },
  {
    component: 'InputPassword',
    componentProps: {
      placeholder: '请输入新密码',
      allowClear: true,
      size: 'large',
      maxLength: 256,
      required: true,
    },
    fieldName: 'newPassword',
    label: '新密码',
    rules: z.string().min(6, { message: '新密码不能为空' }),
  },
  {
    component: 'InputPassword',
    componentProps: {
      placeholder: '请输入新密码',
      allowClear: true,
      size: 'large',
      maxLength: 256,
      required: true,
    },
    fieldName: 'confirmPassword',
    label: '确认密码',
    rules: z.string().min(6, { message: '确认密码不能为空' }),
  },
];

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  schema,
  handleSubmit: onSubmit,
});

const [Modal, modalApi] = useVbenModal({
  centered: true,
  bordered: false,
  fullscreenButton: false,
  closeOnClickModal: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    await formApi.validateAndSubmitForm();
    // modalApi.close();
  },
  title: '修改密码',
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
