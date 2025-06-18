<!-- eslint-disable array-callback-return -->
<!-- eslint-disable unicorn/no-array-reduce -->
<script setup lang="ts">
import type { Ref, VNodeRef } from 'vue';

import { computed, onUnmounted, reactive, ref, shallowRef, unref } from 'vue';

import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Avatar, Button, Radio, RadioGroup, Space } from 'ant-design-vue';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';

import {
  chatStop,
  editGroupConfig,
  getSubjectList,
  renameConversation,
} from '#/api';
import ChatView from '#/components/ChatAi/index.vue';
import renderHtml from '#/components/Markdown/rederMardown.vue';
import { useRxWorkerQueue } from '#/hooks/useRxWorkerQueuecopy';
import { delay } from '#/utils';

import ChatGroup from './components/chatGroup.vue';
import ModelList from './components/modelList.vue';

const fpsp_custom = '<div class="fpsp_custom_stop text-[red]">您已取消！</div>';
const accessStore = useAccessStore();
const userStore = useUserStore();
// 创建队列实例
const queue = useRxWorkerQueue('sse', 2);
// 倒序渲染// role:user/assistant/error/model-change/system
const chatList: Ref<any[]> = ref([]);
const defaultConfig: any = shallowRef({});
const chatRef: VNodeRef = shallowRef(null);
const chatGroupRef: VNodeRef = shallowRef(null);
const state = reactive({
  groupId: '',
  loading: false,
  isStreamLoad: false,
  webSearchLoading: false,
  isLoading: false,
  isInit: false,
  task_id: '',
  coverage: '',
  kb_config: {
    empty_config: {
      enabled: true,
      response: '抱歉，我暂时无法回答您的问题。',
    },
    enabled: true,
    force_retrieve: true,
    kbs: [],
    keyword_extraction_config: {
      enabled: true,
      top_n: 3,
    },
    retrieval_model: 'single',
    rewrite_config: {
      enabled: true,
    },
  },
});

const updateWebSearchConfig = (config: any) => {
  if (!config?.models?.[0]) return;
  return {
    ...config.config,
    models: config.models.map((item: any) => ({
      chat_id: item.chat_id,
      file_upload: item.file_upload,
      kb_config: item.kb_config,
      mcp_config: item.mcp_config,
      model: item.model,
      websearch_config: item.websearch_config,
    })),
    window_mode: config.window_mode,
  };
};

const handleSelectCoverage = async (type: string) => {
  try {
    if (!unref(defaultConfig)?.id) return;
    const config = cloneDeep(unref(defaultConfig));
    state.webSearchLoading = true;
    if (['kb', 'note'].includes(type)) {
      state.kb_config.force_retrieve = true;
      state.kb_config.enabled = true;
      config.models[0].websearch_config.enabled = false;
      const res = await getSubjectList();
      state.kb_config.kbs = (res?.data ?? []).reduce((acc: any, item: any) => {
        if (isEmpty(item.sub_knowledge_base)) return acc;
        item.sub_knowledge_base.forEach((sub: any) => {
          if (isEmpty(sub.sub_knowledge_base)) return;
          const isPrivate = sub.department?.name === userStore.userInfo?.name;
          if (type === 'note' && isPrivate) {
            acc.push(...sub.sub_knowledge_base.map((p: any) => ({ id: p.id })));
          } else if (type === 'kb' && !isPrivate) {
            acc.push(...sub.sub_knowledge_base.map((p: any) => ({ id: p.id })));
          }
        });
        return acc;
      }, []);
    } else {
      state.kb_config.kbs = [];
      state.kb_config.force_retrieve = false;
      state.kb_config.enabled = false;
      // config.models[0].kb_config = {};
      const enabled = config.models?.[0]?.websearch_config?.enabled ?? false;
      config.models[0].websearch_config.enabled = !enabled;
    }
    config.models[0].kb_config = cloneDeep(state.kb_config);
    const newEnabled = config.models?.[0]?.websearch_config?.enabled;
    const newKbConfig = config.models?.[0]?.kb_config ?? {};
    const updatedConfig = updateWebSearchConfig(config);
    await editGroupConfig(config.id, updatedConfig);
    unref(defaultConfig).models[0].websearch_config.enabled = newEnabled;
    unref(defaultConfig).models[0].kb_config = newKbConfig;
    state.coverage = type;
  } catch (error) {
    console.warn('🚀 ~ handleSelectCoverage ~ error:', error);
  } finally {
    state.webSearchLoading = false;
  }
};

const webSearch = () => handleSelectCoverage('web');

const handleCoverageChange = () => handleSelectCoverage(state.coverage);

const handleOperation = (item: any, type: string) => {
  if (type === 'replay' && !state.isStreamLoad) onSend(item.query);
};

const onStop = function (clean: boolean = true) {
  state.loading = false;
  state.isStreamLoad = false;
  const task_id = state.task_id;
  state.task_id = '';
  if (!clean) {
    const lastItem = chatList.value[0];
    lastItem.content += fpsp_custom;
    if (task_id.length > 0) {
      const chat_id = unref(defaultConfig)?.chat_configs?.[0]?.chat_id;
      queue.cleanup();
      if (chat_id) chatStop(chat_id, task_id);
    }
    return;
  }
  queue.cleanup();
};

// 消息处理函数
const createMessage = (content: string, role: string, query: string): any => {
  const others = {
    message: '',
    message_id: '',
    conversation_id: '',
    websearch_result: {
      engines: [],
      query: '',
      results: [],
    },
    stage: '',
    metadata: {
      mcp: [],
      quote: [],
      usage: [],
    },
    message_files: [],
    retriever_resources: [],
    agent_thoughts: [],
  };
  return {
    name: role === 'user' ? '自己' : 'FPAI',
    created_at: Date.now(),
    content,
    query,
    role,
    ...(role === 'assistant' ? others : {}),
    reasoning: role === 'assistant' ? '' : void 0,
  };
};

const onSend = async function (inputValue: string) {
  if (!inputValue || state.isStreamLoad) return;
  queue.cleanup();
  state.isInit = true;
  await Promise.all([chatRef.value?.backBottom(), delay(100)]);
  chatList.value.unshift(createMessage(inputValue, 'user', inputValue));
  // 空消息占位
  chatList.value.unshift(createMessage('', 'assistant', inputValue));
  completions(inputValue);
};

// 创建 API 请求配置
const createApiPayload = (config: any, inputValue: string) => ({
  id: config.chat_id,
  headers: {
    Authorization: `Bearer ${accessStore.accessToken}`,
  },
  data: {
    conversation_id: config?.conversation_id ?? '',
    files: [
      /* {
        id: '76606324468c11f09acb0242c0a8d007',
        transfer_method: 'local_file',
        type: 'file',
        upload_file_id: '76606324468c11f09acb0242c0a8d007',
      }, */
    ],
    inputs: {},
    query: inputValue,
    response_mode: 'streaming',
  },
});

// 统一的错误处理
const handleError = (error: any, lastItem: any) => {
  const errorMessage = error?.message ?? error ?? '发生未知错误，请稍后重试';
  lastItem.role = 'error';
  lastItem.content = errorMessage;
  console.error('Chat error:', error);
};

const messageHandler = (() => {
  const handleWebSearch = (data: any, lastItem: any) => {
    if (data.conversation_id) lastItem.conversation_id = data.conversation_id;
    if (data?.message_id) lastItem.message_id = data.message_id;
    if (
      ['content_analyzing', 'results_received', 'search_initiated'].includes(
        data?.stage,
      )
    ) {
      lastItem.message = data.message;
    }
    if (data?.stage) lastItem.stage = data.stage;
    const newResult = data.websearch_result ?? {};
    const oldResult = lastItem.websearch_result;
    if (newResult.engines) oldResult.engines = newResult.engines;
    if (newResult.query) oldResult.query = newResult.query;
    if (newResult.results) {
      oldResult.results.push(...newResult.results);
      lastItem.metadata.quote = oldResult.results.map((item: any) => ({
        name: item.title,
        data: `SNIPPET:${item.snippet}`,
        url: item.link,
        type: 'websearch',
      }));
    }
  };
  const handleStreamEnd = (data: any, lastItem: any) => {
    /* if (lastItem.content.length === 0) {
      chatList.value.splice(0, 1);
    } */
    if (!lastItem.content.includes(fpsp_custom)) {
      lastItem.content += fpsp_custom;
    }
    const task_id = data?.task_id ?? data?.message_id;
    const chat_id = unref(defaultConfig)?.chat_configs?.[0]?.chat_id;
    queue.cleanup();
    if (task_id && chat_id) chatStop(chat_id, task_id);
  };
  const handleMessageError = (data: any, lastItem: any) => {
    /* if (data?.code === 'completion_request_error') {
      handleError(data?.message, lastItem);
    } */
    handleError(data?.message, lastItem);
  };
  const handleKbSearch = (data: any, lastItem: any) => {
    console.log('🚀 ~ return ~ data:', data);
  };
  const handleMessageEnd = async () => {
    try {
      const config = unref(defaultConfig)?.chat_configs?.[0] ?? {};
      if (config?.conversation_id) return;
      const res = await renameConversation(unref(defaultConfig)?.group_id, {
        auto_generate: true,
        name: '',
      });
      const newConfig = res?.data?.chat_list?.[0] ?? {};
      if (isEmpty(newConfig)) return;
      defaultConfig.value.chat_configs[0] = newConfig;
      unref(chatGroupRef)?.updataGroupMessage(newConfig);
    } catch (error) {
      console.warn('🚀 ~ return ~ error:', error);
    }
  };
  const handleMessage = (data: any, lastItem: any) => {
    if (data?.answer) {
      lastItem.content += data.answer;
    }
  };
  return async (e: any, lastItem: any, userItem?: any) => {
    try {
      if (e?.data?.type !== 'message') return;
      const data = e?.data?.data ?? {};
      if (!state.isStreamLoad) {
        handleStreamEnd(data, lastItem);
        return;
      }
      if (state.task_id.length === 0) {
        state.task_id = data?.task_id ?? data?.message_id ?? '';
      }
      if (data?.event === 'error') handleMessageError(data, lastItem);
      if (data?.event === 'websearch_event') handleWebSearch(data, lastItem);
      if (['kb', 'note'].includes(state.coverage)) {
        handleKbSearch(data, lastItem);
      }
      if (data?.event === 'message') handleMessage(data, lastItem);
      if (data?.event === 'message_end') handleMessageEnd();
    } catch (error) {
      console.warn('🚀 ~ return ~ error:', error);
    }
  };
})();

const completions = async (inputValue: string) => {
  const config = unref(defaultConfig)?.chat_configs?.[0] ?? {};
  if (isEmpty(config)) return;
  state.loading = true;
  state.isStreamLoad = true;
  await delay(100);
  const lastItem = chatList.value[0];
  const userItem = chatList.value[1];
  const payload = createApiPayload(config, inputValue);
  try {
    await queue.enqueue(payload, {
      maxRetries: 0,
      messageHandler: (e: any) => messageHandler(e, lastItem, userItem),
    });
  } catch (error: any) {
    handleError(error, lastItem);
  }
};

queue.taskSubject.subscribe((task: any) => {
  if (['error', 'success'].includes(task?.status)) {
    onStop(true);
    if (task?.status === 'error') {
      const lastItem = chatList.value[0];
      handleError(task?.error, lastItem);
    }
  }
});

const handleGroupMessages = async (data: any) => {
  if (!state.isInit) state.isInit = true;
  chatRef.value?.backBottom();
  await delay(100);
  chatList.value = data;
};

const groupChange = async (id: string) => (state.groupId = id);

const defaultConfigChange = (config: any) => {
  defaultConfig.value = config;
  const configs = config?.models?.[0] ?? {};
  if (configs?.websearch_config?.enabled) {
    state.coverage = 'web';
    return;
  }
  if (isEmpty(configs?.kb_config?.kbs)) {
    state.coverage = '';
    return;
  }
  state.coverage = configs?.kb_config?.kbs?.length > 1 ? 'kb' : 'note';
};

const isWebSearchEnabled = computed(() => {
  const configs = unref(defaultConfig)?.models?.[0] ?? {};
  return configs?.websearch_config?.enabled ?? false;
});

onUnmounted(() => {
  chatList.value = [];
  onStop(true);
});
</script>
<template>
  <div
    class="relative p-[15px]"
    :class="{
      ['bg-[#fff]']: chatList.length > 0 || state.isInit,
      ['h-[calc(100vh-50px)]']: preferences.app.isMobile && state.isInit,
      ['h-[100vh]']: !preferences.app.isMobile && state.isInit,
      [$style.calc_container]: chatList.length === 0 && !state.isInit,
      ['!w-full']:
        preferences.app.isMobile && chatList.length === 0 && !state.isInit,
    }"
    v-loading="state.isLoading"
  >
    <ChatView
      ref="chatRef"
      :model-value="chatList"
      :loading="state.loading"
      :is-stream-load="state.isStreamLoad"
      :web-search-enabled="isWebSearchEnabled"
      @send="onSend"
      @stop="() => onStop(false)"
      @operation="handleOperation"
      :is-init="state.isInit"
    >
      <template #title>
        <h1
          v-if="chatList.length === 0 && !state.isInit"
          class="mb-[60px] text-center text-[32px] font-medium"
        >
          你想了解什么呢？
        </h1>
      </template>
      <template #header>
        <div class="my-[10px] ml-[5px] flex items-center">
          <div
            class="mr-[10px]"
            :class="{ 'text-[#cccdcd]': state.isStreamLoad }"
          >
            搜索范围
          </div>
          <RadioGroup
            :disabled="state.isStreamLoad || state.webSearchLoading"
            v-model:value="state.coverage"
            @change="handleCoverageChange"
          >
            <Radio value="note">我的笔记</Radio>
            <Radio value="kb">知识库</Radio>
          </RadioGroup>
        </div>
      </template>
      <template #prefix>
        <Space>
          <ModelList
            :group-id="state.groupId"
            v-model:loading="state.isLoading"
            @change="defaultConfigChange"
            :disabled="state.loading || state.isStreamLoad"
          />
          <Button
            :disabled="state.isStreamLoad || state.webSearchLoading"
            class="flex items-center rounded-[32px]"
            @click="webSearch"
            :loading="state.webSearchLoading"
          >
            <span class="icon-[hugeicons--internet]"></span>
            <span>&nbsp;联网搜索&nbsp;</span>
            <span
              class="icon-[tabler--point-filled] scale-[1.5]"
              :class="[isWebSearchEnabled ? 'text-[#389e0d]' : 'text-[#999]']"
            ></span>
          </Button>
          <ChatGroup
            ref="chatGroupRef"
            v-model:loading="state.isLoading"
            @change="handleGroupMessages"
            @update:group-id="groupChange"
            :disabled="state.loading || state.isStreamLoad"
          >
            <Button
              variant="text"
              class="flex items-center px-[8px]"
              :disabled="state.loading || state.isStreamLoad"
            >
              <span class="icon-[weui--time-outlined] text-[16px]"></span>
            </Button>
          </ChatGroup>
        </Space>
      </template>
      <template #assistant="{ row }">
        <renderHtml
          :content="row.content"
          :websearch_result="row.websearch_result"
          :metadata="row.metadata"
        />
      </template>
      <template #avatar="{ row }">
        <Avatar :size="32" class="border bg-slate-50 text-[#000] shadow-sm">
          <template #icon>
            <span v-if="row.role === 'user'" class="icon-[uil--user]"></span>
            <span v-else class="icon-[hugeicons--robotic]"></span>
          </template>
        </Avatar>
      </template>
    </ChatView>
  </div>
</template>
<style lang="less" module>
.calc_container {
  width: 700px;
  min-height: 140px;
  top: 25%;
  margin: 0 auto;
  :global {
    .t-chat-sender__textarea {
      background-color: #fff;
    }
  }
}
</style>
