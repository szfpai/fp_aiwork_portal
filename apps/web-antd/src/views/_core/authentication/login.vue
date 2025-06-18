<script setup lang="ts">
import { onMounted } from 'vue';

import { VbenButton } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useAuthStore } from '#/store';
import { loadMapToLocalStorage, rsaEncrypt } from '#/utils';

import { formSchema, publicKey } from './config';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  commonConfig: {
    hideRequiredMark: true,
  },
  schema: formSchema,
  showDefaultActions: false,
});

const REMEMBER_ME_KEY = `REMEMBER_ME_USERNAME_${location.hostname}`;
const accountMaps = loadMapToLocalStorage('ADMIN_ACCOUNT');
// accountMaps.set('admin@oneai.art', '1234');
const options =
  accountMaps.size > 0
    ? [...accountMaps].map((item) => ({
        label: item[0],
        value: item[0],
      }))
    : [];

async function handleSubmit() {
  try {
    const { valid } = await formApi.validate();
    const { email, password, remember_me } = await formApi.getValues();
    if (valid) {
      localStorage.setItem(REMEMBER_ME_KEY, remember_me);
      const res: any = await authStore.authLogin({
        email,
        password: rsaEncrypt(password, publicKey),
        remember_me,
      });
      message.loading({
        content: `初始化中...`,
        duration: 1,
      });
      if (!res) return;
      console.warn('🚀 ~ handleSubmit ~ res:', res);
      if (accountMaps.has(email)) accountMaps.delete(email);
      if (remember_me) {
        accountMaps.set(email, password);
      }
      localStorage.setItem('ADMIN_ACCOUNT', JSON.stringify([...accountMaps]));
    }
  } catch (error) {
    console.error(error);
  }
}

onMounted(() => {
  if (accountMaps.size > 0) {
    const remember_me = JSON.parse(
      localStorage.getItem(REMEMBER_ME_KEY) || 'false',
    );
    const [email, password] = accountMaps.entries().next().value || [];
    formApi.setValues({
      email,
      password,
      remember_me,
    });
  }
  formApi.updateSchema([
    {
      fieldName: 'email',
      componentProps: {
        options,
        onChange: async () => {
          formApi.setFieldValue('password', '', false);
        },
        onSearch: async (v: string) => {
          formApi.updateSchema([
            {
              fieldName: 'email',
              componentProps: {
                options: options.filter((n: any) => n.value.includes(v)),
              },
            },
          ]);
        },
        onSelect: async (v: string) => {
          if (!accountMaps.has(v)) return;
          formApi.setFieldValue('password', accountMaps.get(v));
        },
      },
    },
  ]);
});

defineExpose({
  getFormApi: () => formApi,
});
</script>

<template>
  <div @keydown.enter.prevent="handleSubmit" class="login-container">
    <Form />
    <VbenButton
      :class="{
        'cursor-wait': authStore.loginLoading,
      }"
      :loading="authStore.loginLoading"
      aria-label="login"
      class="w-full"
      @click="handleSubmit"
    >
      {{ $t('common.login') }}
    </VbenButton>
  </div>
</template>
