import type { ExtendedDrawerApi } from '@vben/common-ui';

import { acceptHMRUpdate, defineStore } from 'pinia';

interface AssistantState {
  assInstance: ExtendedDrawerApi;
}

/**
 * @zh_CN global 助手实例
 */
export const useAssStore = defineStore('assistant', {
  actions: {
    setAssInstance(instance: ExtendedDrawerApi) {
      this.assInstance = instance;
    },
  },
  state: (): AssistantState => ({
    assInstance: {} as ExtendedDrawerApi,
  }),
});

// 解决热更新问题
const hot = import.meta.hot;
if (hot) {
  hot.accept(acceptHMRUpdate(useAssStore, hot));
}
