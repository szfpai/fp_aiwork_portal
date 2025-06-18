import type { VbenFormSchema } from '@vben/common-ui';

import { h } from 'vue';

import { z } from '@vben/common-ui';
import { $t } from '@vben/locales';

export const formSchema: VbenFormSchema[] = [
  {
    component: 'AutoComplete',
    componentProps: {
      size: 'large',
      placeholder: $t('authentication.username'),
      options: [],
      class: 'w-full',
      allowClear: true,
      maxLength: 64,
    },
    fieldName: 'email',
    label: $t('authentication.username'),
    rules: z
      .string()
      .min(5, { message: $t('authentication.usernameTip') })
      .email({ message: '邮箱格式错误' }),
  },
  {
    component: 'InputPassword',
    componentProps: {
      placeholder: $t('authentication.password'),
      allowClear: true,
      size: 'large',
      maxLength: 256,
      required: true,
    },
    fieldName: 'password',
    label: $t('authentication.password'),
    rules: z.string().min(4, { message: $t('authentication.passwordTip') }),
  },
  {
    component: 'VbenCheckbox',
    fieldName: 'remember_me',
    componentProps: {
      class: 'w-full forget-container',
    },
    renderComponentContent: () => ({
      default: () =>
        h(
          'div',
          {
            class: 'flex justify-between w-full',
          },
          [h('span', $t('authentication.rememberMe'))],
        ),
    }),
  },
];

export const publicKey =
  '-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArq9XTUSeYr2+N1h3Afl/z8Dse/2yD0ZGrKwx+EEEcdsBLca9Ynmx3nIB5obmLlSfmskLpBo0UACBmB5rEjBp2Q2f3AG3Hjd4B+gNCG6BDaawuDlgANIhGnaTLrIqWrrcm4EMzJOnAOI1fgzJRsOOUEfaS318Eq9OVO3apEyCCt0lOQK6PuksduOjVxtltDav+guVAA068NrPYmRNabVKRNLJpL8w4D44sfth5RvZ3q9t+6RTArpEtc5sh5ChzvqPOzKGMXW83C95TxmXqpbK6olN4RevSfVjEAgCydH6HN6OhtOQEcnrU97r9H0iZOWwbw3pVrZiUkuRD1R56Wzs2wIDAQAB-----END PUBLIC KEY-----';
