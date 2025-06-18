<!-- eslint-disable unicorn/no-array-reduce -->
<!-- eslint-disable unicorn/no-object-as-default-parameter -->
<script lang="ts" setup>
import { onMounted, reactive } from 'vue';

import { EllipsisText } from '@vben/common-ui';

import { Button, Input, Modal, Popover } from 'ant-design-vue';

import {
  chatGroup,
  chatGroupMessages,
  createChatGroup,
  deleteChatGroup,
  renameConversation,
} from '#/api';
import Dropdown from '#/components/Dropdown/index.vue';
import { calcZIndex } from '#/utils';

defineProps<{
  disabled: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:loading', payload: boolean): void;
  (e: 'change', payload: any[]): void;
  (e: 'update:group-id', payload: string): void;
}>();

const subjectDropDownOptions = [
  /*   {
    key: 'collect',
    label: '收藏',
    icon: 'icon-[material-symbols--favorite-outline] mr-[5px]',
  }, */
  {
    key: 'smart-name',
    label: '智能命名',
    icon: 'icon-[hugeicons--property-edit] mr-[5px]',
  },
  {
    key: 'rename',
    label: '重新命名',
    icon: 'icon-[lsicon--edit-outline] mr-[5px]',
  },
  {
    key: 'delete',
    label: '删除',
    className: 'text-[#f5222d]',
    icon: 'icon-[material-symbols--delete-outline] mr-[5px]',
  },
];

const state = reactive({
  visible: false,
  isLoading: false,
  chat_id: '',
  messageList: [] as any[],
});

const processMessages = (data: any[]) => {
  return data.reduce((acc: any[], item: any) => {
    (item.messages?.data ?? []).forEach((msg: any) => {
      acc.push(
        {
          ...msg,
          content: msg.query,
          role: 'user',
          chat_id: item.chat_id,
          conversation_id: item.conversation_id,
        },
        {
          ...msg,
          content: msg.answer.length > 0 ? msg.answer : msg.error,
          role: msg.answer.length > 0 ? 'assistant' : 'error',
          reasoning: msg.reasoning ?? '',
          chat_id: item.chat_id,
          conversation_id: item.conversation_id,
        },
      );
    });
    return acc;
  }, []);
};

const selectMessage = async (item: any): Promise<any> => {
  if (state.chat_id === item.chat_id) return;
  try {
    state.visible = false;
    state.chat_id = item.chat_id;
    emit('change', []);
    emit('update:loading', true);
    const res = await chatGroupMessages(item.group_id, { limit: 30, page: 1 });
    const messages = res?.data ?? [];
    const data = processMessages(messages);
    console.log('🚀 ~ selectMessage ~ data:', data);
    emit('update:group-id', item.group_id);
    emit('change', data.reverse());
  } finally {
    emit('update:loading', false);
  }
};

const updataGroupMessage = (data: any) => {
  const idx = state.messageList.findIndex(
    (item) => item.chat_id === data.chat_id,
  );
  if (idx === -1) return;
  state.messageList.splice(idx, 1, data);
};

const refresh = async (params: any = { limit: 30, page: 1 }): Promise<any> => {
  try {
    state.isLoading = true;
    const res: any = await chatGroup(params);
    state.messageList = (res?.data?.data ?? []).map((item: any) => ({
      ...item,
      ...item?.chat_configs?.[0],
      _loading: false,
      _edit: false,
      _name: '',
    }));
    // chat_id.value = messageList.value?.[0]?.chat_id ?? '';
    emit('update:group-id', state.messageList?.[0]?.group_id ?? '');
  } finally {
    state.isLoading = false;
  }
};

const deleteMessage = async (id: string, index: number) => {
  try {
    const idx = index + 1 > state.messageList.length ? 0 : index + 1;
    const item = state.messageList?.[idx];
    await deleteChatGroup(id);
    state.messageList.splice(index, 1);
    await selectMessage(item);
    setTimeout(refresh, 100);
  } catch (error) {
    console.warn('🚀 ~ deleteMessage ~ error:', error);
  }
};

const createChatGroupFn = async () => {
  try {
    state.isLoading = true;
    const res = await createChatGroup();
    const data = res?.data ?? {};
    await selectMessage({
      group_id: data?.group_id,
      chat_id: data?.chat_configs?.[0]?.chat_id,
    });
    setTimeout(refresh, 100);
  } catch (error) {
    console.warn('🚀 ~ createChatGroup ~ error:', error);
  } finally {
    state.isLoading = false;
  }
};

const onPressEnter = async (item: any) => {
  const name = item.name;
  try {
    item._edit = false;
    if (!item._name || item._name.length === 0) return;
    item._loading = true;
    item.name = item._name;
    const res = await renameConversation(item?.group_id, {
      auto_generate: false,
      name: item._name,
    });
    const newName = res?.data?.chat_list[0]?.name ?? '';
    item.name = newName.length > 0 ? newName : name;
  } catch (error) {
    item.name = name;
    console.warn('🚀 ~ handleMenuClick ~ error:', error);
  } finally {
    item._loading = false;
  }
};

const handleMenuClick = async (e: any, row: any) => {
  const { key } = e?.item?._payload ?? {};
  if (key === 'rename') {
    row._edit = true;
    row._name = row.name;
    return;
  }
  if (key === 'smart-name') {
    try {
      row._loading = true;
      const res = await renameConversation(row?.group_id, {
        auto_generate: true,
        name: '',
      });
      const name = res?.data?.chat_list[0]?.name ?? '';
      if (name.length > 0) row.name = name;
    } catch (error) {
      console.warn('🚀 ~ handleMenuClick ~ error:', error);
    } finally {
      row._loading = false;
    }
    return;
  }
  if (key === 'delete') {
    Modal.warning({
      title: '温馨提示',
      content: '要删除该会话吗？',
      okText: '确定',
      cancelText: '取消',
      centered: true,
      closable: true,
      maskClosable: false,
      zIndex: calcZIndex(),
      async onOk() {
        const group_id = row?.group_id;
        const index = state.messageList.findIndex(
          (item) => item.group_id === group_id,
        );
        return await deleteMessage(group_id, index);
      },
    });
  }
  /* const { key } = e?.item?._payload ?? {};
  if (key === 'edit') inSubjectModalApi.setData(row).open();
  if (key === 'delete') {
    Modal.warning({
      title: '温馨提示',
      content: '要删除该会话吗？',
      okText: '确定',
      cancelText: '取消',
      centered: true,
      closable: true,
      maskClosable: false,
      onOk: () => {
        return new Promise((resolve, reject) => {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject();
        });
      },
    });
  } */
};

onMounted(refresh);

defineExpose({
  refresh,
  updataGroupMessage,
});
</script>
<template>
  <Popover
    placement="rightBottom"
    v-model:open="state.visible"
    :mouse-leave-delay="0"
    :z-index="calcZIndex()"
    :trigger="disabled ? 'manual' : 'click'"
  >
    <template #content>
      <div
        class="h-[300px] w-[300px] overflow-y-scroll"
        v-loading="state.isLoading"
      >
        <div
          v-for="item in state.messageList"
          :key="item.chat_id"
          class="my-[5px] flex cursor-pointer items-center justify-between rounded-md px-[10px] py-2.5 text-[0.875rem] leading-[1.5rem] hover:bg-[#f5f9fb]"
          :class="{ ['bg-[#f5f9fb]']: state.chat_id === item.chat_id }"
          @click.stop="() => !item._loading && selectMessage(item)"
        >
          <Button
            class="mr-[10px]"
            v-if="item._loading"
            type="text"
            :loading="item._loading"
          />
          <EllipsisText
            placement="left"
            class="w-[calc(100%-25px)] !cursor-pointer"
            :class="{ 'w-[calc(100%-50px)]': item._loading }"
            :line="1"
            :tooltip-overlay-style="{ zIndex: calcZIndex() }"
            v-if="!item._edit"
          >
            {{ item.name }}
          </EllipsisText>
          <Input
            v-else
            @click.stop="null"
            v-model:value="item._name"
            @blur="() => (item._edit = false)"
            @press-enter="() => onPressEnter(item)"
          />
          <Dropdown
            :z-index="calcZIndex()"
            placement="bottomRight"
            @click="(e: any) => handleMenuClick(e, item)"
            :options="subjectDropDownOptions"
          />
        </div>
      </div>
    </template>
    <template #title>
      <div class="flex items-center justify-between">
        <span>会话列表</span>
        <Button
          class="flex items-center font-normal"
          @click="createChatGroupFn"
        >
          <template #icon>
            <span class="icon-[bx--message-add]"></span>
          </template>
          <span class="ml-[5px] text-[12px]">新建会话</span>
        </Button>
      </div>
    </template>
    <slot name="default"></slot>
  </Popover>
</template>
