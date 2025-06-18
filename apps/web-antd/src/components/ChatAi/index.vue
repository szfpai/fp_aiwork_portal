<script setup lang="ts">
import type { Ref, VNodeRef } from 'vue';

import { h, ref } from 'vue';

import {
  Chat,
  ChatAction,
  ChatContent,
  ChatItem,
  ChatLoading,
  ChatReasoning,
  ChatSender,
} from '@tdesign-vue-next/chat';
import { Button, Empty, List, ListItem, Space } from 'ant-design-vue';
import isEmpty from 'lodash/isEmpty';

import { getFileIconByType, getFileSize } from '#/utils';

import '@tdesign-vue-next/chat/dist/tdesign-vue-chat.min.css';

defineProps<{
  chatAction?: any;
  chatItem?: any;
  chatReasoning?: any;
  chatSender?: any;
  className?: any;
  isInit?: boolean;
  isStreamLoad?: boolean;
  loading?: boolean;
  modelValue: any[];
  presets?: any[];
  webSearchEnabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', ...arg: any[]): void;
  (e: 'stop', ...arg: any[]): void;
  (e: 'expandChange', ...arg: any[]): void;
  (e: 'operation', ...arg: any[]): void;
  (e: 'fileSelect', ...arg: any[]): void;
}>();

// const roles = ['user', 'assistant', 'error', 'system', 'model-change'];

const chatRef: VNodeRef = ref(null);

const isShowToBottom: Ref<boolean> = ref(false);

// 滚动到底部
const backBottom = (): void => {
  if (!chatRef.value) return;
  chatRef.value?.scrollToBottom?.({
    behavior: 'smooth',
  });
};

const handleChange = (...arg: any[]): void => emit('expandChange', ...arg);

const renderHeader = (flag: boolean, item: any): any => {
  if (flag) return h(ChatLoading, { text: '思考中...' });
  const endText = item.duration
    ? `已深度思考(用时${item.duration}秒)`
    : '已深度思考';
  return h(
    'div',
    { class: 'flex items-center' },

    [
      h('span', {
        class: 'icon-[gg--check-o] mr-[5px] text-[20px] text-[#52c41a]',
      }),
      h('span', {}, endText),
    ],
  );
};

const renderReasoningContent = (reasoningContent: string): any => {
  return h(ChatContent, { content: reasoningContent, role: 'assistant' });
};

const handleOperation = (...arg: any[]): void => emit('operation', ...arg);

const onStop = (...arg: any[]): void => emit('stop', ...arg);

const onSend = (...arg: any[]): void => emit('send', ...arg);

// 是否显示回到底部按钮
const onScroll = function ({ e }: any): void {
  const scrollTop = e.target.scrollTop;
  isShowToBottom.value = scrollTop < 0;
};

const fileSelect = (...arg: any[]): void => emit('fileSelect', ...arg);

defineExpose({
  ...chatRef.value,
  backBottom,
});
</script>
<template>
  <div class="h-full w-full" :class="[$style.chat_container, className]">
    <slot name="title" v-if="$slots.title"></slot>
    <!-- @clear="clearConfirm" -->
    <Chat
      ref="chatRef"
      layout="both"
      :clear-history="false"
      @scroll="onScroll"
      v-bind="$attrs"
    >
      <Empty
        v-if="isEmpty(modelValue) && isInit"
        description=""
        class="flex h-full w-full items-center justify-center"
      />
      <template v-for="(item, index) in modelValue" :key="index">
        <!-- :text-loading="index === 0 && loading" -->
        <ChatItem :role="item.role" variant="base" v-bind="chatItem">
          <template #avatar>
            <template v-if="$slots.avatar">
              <slot name="avatar" :row="item"></slot>
            </template>
            <template
              v-else-if="
                typeof item.avatar === 'string' &&
                item.avatar.startsWith('http')
              "
            >
              <img :src="item.avatar" alt="" class="t-chat__avatar-image" />
            </template>
            <template v-else-if="typeof item.avatar === 'function'">
              <component :is="item.avatar" />
            </template>
          </template>
          <template #content>
            <slot name="content" v-if="$slots.content"></slot>
            <template v-else>
              <template v-if="item.role === 'user'">
                <slot v-if="$slots.user" name="user" :row="item"></slot>
                <ChatContent v-else :content="item.content" />
                <List
                  class="ml-[12px] w-[500px]"
                  size="small"
                  bordered
                  :data-source="item?.message_files"
                  v-if="!isEmpty(item?.message_files)"
                >
                  <template #renderItem="{ item: i }">
                    <ListItem>
                      <Space class="flex items-center text-[12px]" :size="5">
                        <span
                          :class="`${getFileIconByType(i.name.split('.').pop())} mt-[3px] text-[20px]`"
                        ></span>
                        <span>{{ i.name }}</span>
                        <span>({{ getFileSize(i.file_size) }})</span>
                      </Space>
                    </ListItem>
                  </template>
                </List>
              </template>
              <template v-if="item.role === 'assistant'">
                <ChatReasoning
                  v-if="item.reasoning?.length > 0"
                  :default-collapsed="!(index === 0 && isStreamLoad)"
                  expand-icon-placement="right"
                  :collapse-panel-props="{
                    header: renderHeader(!!(index === 0 && isStreamLoad), item),
                    content: renderReasoningContent(item.reasoning),
                  }"
                  @expand-change="(v: any) => handleChange(v, { item, index })"
                  v-bind="chatReasoning"
                />
                <template v-else-if="index === 0 && isStreamLoad">
                  <slot name="loading" :row="item" v-if="$slots.loading"></slot>
                  <Button
                    v-else-if="webSearchEnabled"
                    type="text"
                    class="bg-muted/70 ml-[12px] mt-[5px] flex items-center"
                    :loading="isStreamLoad"
                  >
                    <span class="mr-[150px]">{{ item.message }}</span>
                    <span class="grp-2 flex items-center">
                      <span
                        class="icon-[hugeicons--internet] translate-y-[1.5px]"
                      >
                      </span>
                      <span>&ensp;联网搜索</span>
                    </span>
                  </Button>
                  <ChatLoading v-else text="思考中..." />
                </template>
                <template v-if="item.content.length > 0">
                  <slot
                    v-if="$slots.assistant"
                    name="assistant"
                    :row="item"
                  ></slot>
                  <ChatContent v-else :content="item.content" />
                </template>
              </template>
              <template v-if="item.role === 'error'">
                <slot v-if="$slots.error" name="error" :row="item"></slot>
                <ChatContent v-else :content="item.content" />
              </template>
              <template v-if="item.role === 'model-change'">
                <slot
                  v-if="$slots['model-change']"
                  name="model-change"
                  :row="item"
                ></slot>
                <ChatContent v-else :content="item.content" />
              </template>
              <template v-if="item.role === 'system'">
                <slot v-if="$slots.system" name="system" :row="item"></slot>
                <ChatContent v-else :content="item.content" />
              </template>
            </template>
          </template>
          <template #actions v-if="!(index === 0 && isStreamLoad)">
            <slot name="actions" v-if="$slots.actions"></slot>
            <ChatAction
              v-else
              :content="item.content"
              :operation-btn="['replay', 'copy']"
              @operation="(...arg) => handleOperation(item, ...arg)"
              v-bind="chatAction"
            />
          </template>
        </ChatItem>
      </template>
      <template #footer>
        <slot name="footer" v-if="$slots.footer"></slot>
        <ChatSender
          v-else
          :stop-disabled="isStreamLoad"
          :disabled="loading"
          :textarea-props="{
            placeholder: '世间答案浩如星海，真理之光独缺一问！',
          }"
          @stop="onStop"
          @send="onSend"
          @file-select="fileSelect"
          v-bind="chatSender"
        >
          <template #header v-if="$slots.header">
            <slot name="header"></slot>
          </template>
          <template #inner-header v-if="$slots['inner-header']">
            <slot name="inner-header"></slot>
          </template>
          <template #prefix v-if="$slots.prefix">
            <slot name="prefix"></slot>
          </template>
          <template #suffix="{ renderPresets }">
            <slot name="suffix" v-if="$slots.suffix"></slot>
            <component v-else :is="renderPresets(presets ?? [])" />
          </template>
        </ChatSender>
      </template>
    </Chat>
    <slot name="bottom" v-if="$slots.bottom"></slot>
    <Button
      v-else
      v-show="isShowToBottom"
      variant="text"
      class="flex items-center justify-center"
      :class="$style.to_bottom"
      @click="backBottom"
    >
      <span class="icon-[fluent-mdl2--down] text-[16px]"></span>
    </Button>
  </div>
</template>
<style lang="less" module>
.chat_container {
  :global {
    .t-chat {
      .t-chat-sender__header {
        border: none;
      }
      .t-chat__avatar {
        margin-left: 0px;
        margin-right: 0px;
      }
      .t-collapse-panel {
        margin-left: 12px;
      }
      .t-chat-loading {
        margin-top: 12px;
        margin-left: 12px;
      }
      .t-chat__detail-reasoning {
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji',
          'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
        font-size: 0.875rem;
        line-height: 1.25rem;
        margin-top: 5px;
        & + .vditor-reset {
          padding-top: 12px;
        }
        .t-chat-loading {
          margin-top: 0px;
          margin-left: 0px;
        }
      }
      .t-chat__inner {
        margin-bottom: 0;
      }
      .t-chat__inner.user {
        line-height: 1.25rem;
        .t-chat__text {
          padding-right: 12px;
          background-color: #fff;
          font-size: 0.875rem;
          line-height: 1.25rem;
          color: #24292e;
        }
        pre {
          color: #191919;
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
            'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
            'Noto Color Emoji';
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
      }
      .t-textarea__inner {
        &::placeholder {
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
      }
      .t-chat__text--system,
      .t-chat__text--error {
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji',
          'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
        font-size: 0.875rem;
        line-height: 1.25rem;
      }

      //.t-chat__inner.assistant,
      .t-chat__inner.system,
      .t-chat__inner.error {
        .t-chat__text {
          font-size: 0.875rem;
          line-height: 1.25rem;
          background-color: #fff;
        }
      }

      .t-chat__inner.assistant {
        .t-chat__actions-margin {
          margin-left: 5px;
          margin-top: 3px;
          opacity: 0;
          transition: 0.3s;
          .t-button,
          .t-chat__actions {
            border: none;
            background-color: #fff;
          }
          .t-icon {
            font-size: 14px;
          }
          .t-chat__refresh-line {
            display: none;
          }
          .t-button {
            &:hover {
              background-color: #f3f3f3;
            }
          }
        }
        &:hover {
          .t-chat__actions-margin {
            opacity: 1;
          }
        }
      }
    }

    /* 应用滚动条样式 */
    ::-webkit-scrollbar-thumb {
      background-color: var(--td-scrollbar-color);
    }
    ::-webkit-scrollbar-thumb:horizontal:hover {
      background-color: var(--td-scrollbar-hover-color);
    }
    ::-webkit-scrollbar-track {
      background-color: var(--td-scroll-track-color);
    }
  }

  .to_bottom {
    position: absolute;
    left: 50%;
    margin-left: -20px;
    bottom: 180px;
    padding: 0;
    border: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid #dcdcdc;
    box-shadow:
      0px 8px 10px -5px rgba(0, 0, 0, 0.08),
      0px 16px 24px 2px rgba(0, 0, 0, 0.04),
      0px 6px 30px 5px rgba(0, 0, 0, 0.05);
    background-color: #fff;
    font-size: 0.875rem;
  }
}
</style>
