/* eslint-disable unicorn/no-useless-promise-resolve-reject */
import { acceptHMRUpdate, defineStore } from 'pinia';

import { chatGroup, chatGroupConfig } from '#/api';

interface ChattantState {
  defaultConfigs: any;
  chatGroups: any[];
}

/**
 * @zh_CN global 助手实例
 */
export const useChatStore = defineStore('global-chat', {
  actions: {
    async setConfig(id: string) {
      try {
        const res = await chatGroupConfig(id);
        this.defaultConfigs = res?.data ?? {};
        return Promise.resolve(res?.data ?? {});
      } catch (error) {
        return Promise.reject(error);
      }
    },
    async setChatGroups(params: any) {
      try {
        const res = await chatGroup(params);
        this.chatGroups = res?.data?.data ?? [];
        return Promise.resolve(res?.data?.data ?? []);
      } catch (error) {
        return Promise.reject(error);
      }
    },
  },
  state: (): ChattantState => ({
    defaultConfigs: {},
    chatGroups: [],
  }),
});

// 解决热更新问题
const hot = import.meta.hot;
if (hot) {
  hot.accept(acceptHMRUpdate(useChatStore, hot));
}
