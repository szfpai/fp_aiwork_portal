<script setup lang="ts">
import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';
import isEmpty from 'lodash/isEmpty';

import { useVbenForm } from '#/adapter/form';
import { createSubject, updateSubject } from '#/api';

import { subjectSchema } from '../configs';

const userStore = useUserStore();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  schema: subjectSchema,
  // handleSubmit: onSubmit,
});

const defaultValues = {
  is_folder: false,
  auto_structured: false,
  kb_type: 'unstructured',
  language: 'Chinese',
  parser_id: 'naive',
  pid: '',
};

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
      const { row = {}, refresh } = modalApi.getData();
      const values = await formApi.validateAndSubmitForm();
      if (!values) return;
      modalApi.lock();
      const actions = row?.name ? updateSubject : createSubject;
      const pid = defaultValues?.pid.trim() ? defaultValues.pid : row?.pid;
      await actions(row?.id, {
        ...row,
        ...defaultValues,
        ...values,
        pid,
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
  title: '创建知识库',
  onOpenChange: (isOpen: boolean) => {
    !isOpen && modalApi.setData({});
    if (isOpen) {
      const { row = {}, sub_knowledge_base } = modalApi.getData();
      modalApi.setState({ title: row?.name ? '编辑' : '创建知识库' });
      const options = sub_knowledge_base
        .filter(
          (item: any) => item.department?.name !== userStore.userInfo?.name,
        )
        .map((item: any) => {
          return {
            pid: item.id,
            label: item.department.name,
            value: item.department.id,
          };
        });
      formApi.updateSchema([
        {
          fieldName: 'dpt_id',
          componentProps: {
            placeholder: '请选择部门',
            options: [{ label: '请选择', value: '' }, ...options],
            onChange: (_, data: any) => {
              defaultValues.pid = data?.pid ?? '';
            },
          },
        },
      ]);
      if (isEmpty(row)) return;
      formApi.setValues({
        name: row?.name ?? '',
        dpt_id: row?.department.id ?? '',
        description: row?.description ?? '',
      });
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
  <ModalForm>
    <Form class="px-[0.5rem]" />
  </ModalForm>
</template>
