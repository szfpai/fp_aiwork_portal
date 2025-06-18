<script setup lang="ts">
import { onMounted, reactive } from 'vue';

import { useUserStore } from '@vben/stores';

import { Checkbox, Input, List, ListItem } from 'ant-design-vue';

import { getNoteList, getSubjectList } from '#/api';

const state = reactive({
  loading: false,
  dataList: [],
  loadingMore: false,
  noteId: '',
});

const userStore = useUserStore();

const refresh = async () => {
  try {
    state.loading = true;
    if (state.noteId.length === 0) {
      const res = await getSubjectList();
      (res?.data ?? []).forEach((item: any) => {
        if (item.department?.name === userStore.userInfo?.name) {
          const kb = item.sub_knowledge_base?.[0]?.sub_knowledge_base?.[0];
          if (kb?.id) state.noteId = kb.id;
        }
      });
    }
    if (state.noteId.length > 0) {
      const knowledge = await getNoteList(state.noteId);
      state.dataList = knowledge?.data ?? [];
    }
  } catch (error) {
    console.warn('🚀 ~ refresh ~ error:', error);
  } finally {
    state.loading = false;
  }
};

/* const refresh = () => {
  loading.value = true;
  setTimeout(() => {
    dataList.value = Array.from({ length: 18 })
      .fill('')
      .map((_, index) => ({
        id: index,
        checked: index < 10,
        title: `笔记${index + 1}`,
        disabled: index < 10,
      }));
    loading.value = false;
  }, 1000);
}; */

onMounted(refresh);
</script>
<template>
  <div :class="$style.container">
    <Input
      size="large"
      placeholder="搜索笔记"
      class="my-[30px] w-full"
      @keydown.enter="refresh"
    >
      <template #prefix>
        <span class="icon-[iconamoon--search]"></span>
      </template>
    </Input>
    <List
      item-layout="horizontal"
      :data-source="state.dataList"
      :loading="{ spinning: state.loading, size: 'large' }"
      class="h-[450px] overflow-y-auto"
    >
      <template #loadMore v-if="state.loadingMore">
        <div
          :style="{
            textAlign: 'center',
            marginTop: '12px',
            height: '32px',
            lineHeight: '32px',
          }"
        >
          <span>loading more</span>
        </div>
      </template>
      <template #renderItem="{ item }">
        <ListItem class="mb-[20] cursor-pointer bg-white">
          <Checkbox v-model:checked="item.checked" :disabled="item.disabled">
            <div
              class="w-full rounded-[10px] border-[1px] border-[#e5e6ea] bg-[#f6f7fa] p-[8px]"
            >
              {{ item?.file?.summary ?? item?.progress_msg ?? '' }}
            </div>
          </Checkbox>
        </ListItem>
      </template>
    </List>
  </div>
</template>
<style lang="less" module>
.container {
  :global {
    .ant-list-item {
      padding: 12px 0;
      border-block-end: none !important;
    }
    .ant-checkbox-wrapper {
      width: 100%;
      display: flex;
      align-items: center;
      span:last-child {
        display: block;
        flex: 1;
      }
    }
    .ant-checkbox-wrapper-disabled {
      .ant-checkbox-checked {
        .ant-checkbox-inner {
          border: none !important;
          background-color: transparent !important;
          box-shadow: none !important;
        }
      }
    }
  }
}
</style>
