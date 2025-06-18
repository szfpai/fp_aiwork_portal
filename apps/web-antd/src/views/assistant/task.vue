<script lang="ts" setup>
import {
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  reactive,
} from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { Empty, message, SkeletonButton, Tag } from 'ant-design-vue';
import isEmpty from 'lodash/isEmpty';

import { createTask, getTaskRecordList } from '#/api';
import useInterval from '#/hooks/useInterval';
import { downloadFile } from '#/utils';

interface Props {}

defineOptions({
  name: 'AssistantTask',
});

const props = defineProps<Props>();

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;

const state = reactive({
  taskList: [] as any[],
  loading: false,
});

const TaskStatusType: Record<string, string> = {
  cancelled: '取消上传',
  failed: '点击重试',
  paused: '上传暂停',
  queued: '等待上传',
  running: '执行中',
  completed: '下载文件',
  waiting: '执行中',
};

const TaskStatusTag: Record<string, string> = {
  cancelled: 'warning',
  failed: 'error',
  paused: 'processing',
  queued: 'processing',
  running: 'processing',
  completed: 'success',
  waiting: 'processing',
};

const tagClick = useDebounceFn((item: any) => {
  if (item.status_object?.status === 'failed') {
    createRpaTask(item);
    return;
  }
  if (item.status_object?.status === 'completed') {
    // 下载文件
    const result = item?.outputs.filter((d: any) => d?.variable === 'file_url');
    if (isEmpty(result) || !result?.[0]?.value) return;
    downloadFile(result?.[0]?.value, getTaskName(item));
  }
}, 300);

const getTaskName = (item: any) => {
  const task_name = item?.inputs.filter(
    (d: any) => d?.variable === 'task_name',
  );
  return task_name?.[0]?.value ?? '';
};

async function refresh(isLoading: boolean = false) {
  try {
    if (isLoading) state.loading = true;
    const res = await getTaskRecordList();
    state.taskList = res?.data ?? [];
  } catch (error) {
    console.warn('🚀 ~ refresh ~ error:', error);
  } finally {
    state.loading = false;
  }
}

const { pause, resume } = useInterval(
  /* () => {
    const isRunning = state.taskList.some((item) =>
      ['running', 'waiting'].includes(item?.status_object?.status),
    );
    if (isRunning) refresh(false);
    else pause();
  }, */
  refresh,
  2000,
);

const createRpaTask = async (data: any) => {
  try {
    if (isEmpty(data?.inputs)) return;
    state.loading = true;
    pause();
    await createTask(data?.rpa_id, {
      inputs: data?.inputs ?? [],
    });
    message.success('创建成功', 1000);
  } catch (error) {
    console.warn('🚀 ~ handleMove ~ error:', error);
  } finally {
    resume();
    state.loading = false;
  }
};

onMounted(() => {
  refresh(true);
  resume();
});

onUnmounted(() => {
  pause();
});

onActivated(() => {
  resume();
});

onDeactivated(() => {
  pause();
});
</script>
<template>
  <div
    class="flex h-[calc(100vh-65px)] w-full flex-col overflow-y-auto"
    :class="$style.container"
    v-loading="state.loading"
  >
    <Empty
      class="mt-[50%]"
      v-if="isEmpty(state.taskList) && !state.loading"
      :image="simpleImage"
    />
    <div
      class="relative mt-[15px] flex w-full cursor-pointer items-center justify-between rounded-[5px] bg-[#F0F2F4] p-[15px] text-[14px] hover:bg-[#E0E5E6]"
      v-for="(item, index) in state.taskList"
      :key="item?.id ?? index"
    >
      <div class="z-2 w-[calc(100%-65px)] truncate text-[black]">
        {{ getTaskName(item) }}
      </div>
      <Tag
        class="z-2"
        :bordered="false"
        :color="TaskStatusTag[item?.status_object?.status]"
        @click="tagClick(item)"
      >
        {{ TaskStatusType[item?.status_object?.status] }}
      </Tag>
      <SkeletonButton
        active
        block
        v-if="
          ['queued', 'paused', 'running', 'waiting'].includes(
            item?.status_object?.status,
          )
        "
        class="z-1 absolute bottom-0 left-0 top-0"
        :class="[`w-[${item?.status_object?.percent}%]`]"
      />
    </div>
  </div>
</template>
<style lang="less" module>
.container {
  .animated_gradient {
    position: relative;
  }

  .animated_gradient::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0%;
    background: linear-gradient(to right, pink);
    animation: fillLeftToRight 3s infinite;
    z-index: 0;
  }

  @keyframes fillLeftToRight {
    from {
      width: 0%;
    }
    to {
      width: 120%;
    }
  }
  :global {
    .ant-skeleton-button {
      height: 100% !important;
    }
  }
}
</style>
