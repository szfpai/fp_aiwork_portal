<script setup lang="ts">
import type { Component } from 'vue';

import { defineAsyncComponent, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';

import { TabPane, Tabs } from 'ant-design-vue';

import useCachedManager from '#/hooks/useCachedManager';
import { calcZIndex, LoadingComponent } from '#/utils';

defineOptions({
  name: 'Assistant',
});

const { getState, show, hide } = useCachedManager();

const activeKey = ref<string>('chat');

const route = useRoute();

const components: Record<string, Component> = {
  chat: defineAsyncComponent({
    loader: () => import('#/views/assistant/chat.vue'),
    loadingComponent: LoadingComponent,
  }),
  task: defineAsyncComponent({
    loader: () => import('#/views/assistant/task.vue'),
    loadingComponent: LoadingComponent,
  }),
};

const handleClick = (a: any) => show(a);

const panes: Record<string, any> = [
  { title: '聊天', key: 'chat', icon: 'icon-[line-md--chat]' },
  { title: '任务', key: 'task', icon: 'icon-[mingcute--time-line]' },
];

const [Assistant, assistantApi] = useVbenDrawer({
  onCancel() {
    assistantApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const { key } = assistantApi.getData();
      // for (const k in components) reset(k);
      show(key);
      if (['chat', 'task'].includes(key)) activeKey.value = key.toString();
      return;
    }
    hide('task', { destroyOnHide: true });
  },
});

watch(
  () => route.path,
  () => {
    hide('chat', { destroyOnHide: true });
  },
  { immediate: true },
);
</script>

<template>
  <Assistant
    :close-on-press-escape="false"
    :footer="false"
    :z-index="calcZIndex()"
    :class="$style.assistant"
  >
    <template #title>
      <Tabs v-model:active-key="activeKey" @change="handleClick">
        <TabPane v-for="pane in panes" :key="pane.key">
          <template #tab>
            <div class="flex items-center">
              <span class="text-[18px]" :class="pane.icon"></span>
              <span class="ml-[5px] text-[15px] font-medium">
                {{ pane.title }}
              </span>
            </div>
          </template>
        </TabPane>
      </Tabs>
    </template>
    <KeepAlive>
      <template v-for="(c, k) in components" :key="k">
        <component
          :is="c"
          v-if="getState(k).value.keepAlive"
          v-show="getState(k).value.visible"
        />
      </template>
    </KeepAlive>
  </Assistant>
</template>
<style lang="less" module>
.assistant {
  :global {
    .ant-tabs-nav-operations {
      display: none !important;
    }

    h2 {
      font-weight: normal;
    }
    .py-3:nth-child(1) {
      padding: 0 1rem;
    }
    .ant-tabs {
      padding: 10px 0;
      .ant-tabs-tab {
        padding: 0;
      }
      .ant-tabs-tab-active {
      }
      .ant-tabs-nav {
        margin-bottom: 0px;
        &::before {
          display: none;
        }
      }
      .ant-tabs-ink-bar {
        display: none;
      }
      .ant-tabs-tab-btn {
        text-shadow: none;
      }
    }
  }
}
</style>
