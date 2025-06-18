<script lang="ts" setup>
import { ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import { Button, Popover, Tree } from 'ant-design-vue';

import { chatGroupConfig, editGroupConfig, getModelList } from '#/api';
import { calcZIndex } from '#/utils';

const props = defineProps<{
  disabled: boolean;
  groupId: string;
}>();

const emit = defineEmits<{
  (e: 'change', payload: any): void;
}>();
const accessStore = useAccessStore();
const visible = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const autoExpandParent = ref<boolean>(true);
const expandedKeys = ref<(number | string)[]>([]);
const dataList = ref<any[]>([]);
const selectedKeys = ref<string[]>([]);
const configs = ref<any>({});
const defaultConfig = ref<any>({});

const handleSelect = async (value: any, option: any): Promise<any> => {
  try {
    visible.value = false;
    const data = defaultConfig.value?.models?.[0];
    await editGroupConfig(defaultConfig.value?.id, {
      completion_params: defaultConfig.value?.config?.completion_params,
      models: [
        {
          chat_id: data?.chat_id,
          mcp_config: data?.mcp_config,
          model: {
            features: [],
            name: option?.node?.model_id,
            provider: option?.node?.provider_id,
          },
          websearch_config: {
            enable: data?.chat_id.websearch_config?.enable,
            websearch_config_id: '',
          },
        },
      ],
      pre_prompt: defaultConfig.value?.config?.pre_prompt,
      window_mode: defaultConfig.value?.window_mode,
    });
    configs.value = option?.node;
    getDefaultConfig(defaultConfig.value?.id);
  } catch (error) {
    console.warn('🚀 ~ handleSelect ~ error:', error);
  }
};

function toggle(key: string, models: any[]) {
  if (!models?.length) return;
  const index = expandedKeys.value.indexOf(key);
  if (index === -1) {
    expandedKeys.value.push(key);
    return;
  }
  expandedKeys.value.splice(index, 1);
}

const refresh = async (): Promise<any> => {
  try {
    isLoading.value = true;
    const res: any = await getModelList();
    dataList.value = (res?.data ?? []).map((item: any) => {
      return {
        ...item,
        title: item?.provider_name,
        key: item?.provider_id,
        selectable: false,
        models: item?.models?.map((i: any) => {
          if (
            item?.provider_id === expandedKeys.value?.[0] &&
            i?.model_id === selectedKeys.value?.[0]
          ) {
            configs.value = {
              ...i,
              title: i?.model_name,
              key: i?.model_id,
              provider_id: item?.provider_id,
              icon_small: item?.icon_small,
              icon_large: item?.icon_large,
              parentName: item?.provider_name,
            };
          }
          return {
            ...i,
            title: i?.model_name,
            key: i?.model_id,
            provider_id: item?.provider_id,
            icon_small: item?.icon_small,
            icon_large: item?.icon_large,
            parentName: item?.provider_name,
          };
        }),
      };
    });
  } finally {
    isLoading.value = false;
  }
};

const onExpand = (keys: string[]) => {
  expandedKeys.value = keys;
  autoExpandParent.value = false;
};

const getDefaultConfig = async (group_id: string) => {
  try {
    const res = await chatGroupConfig(group_id);
    defaultConfig.value = res?.data ?? {};
  } catch (error) {
    console.warn('🚀 ~ getDefaultConfig ~ error:', error);
  }
};

const init = async (group_id: string) => {
  try {
    await getDefaultConfig(group_id);
    const data = defaultConfig.value?.models?.[0] ?? {};
    selectedKeys.value = [data?.model?.name];
    expandedKeys.value = [data?.model?.provider];
    refresh();
  } catch (error) {
    console.warn('🚀 ~ init ~ error:', error);
  }
};

watch(
  () => props.groupId,
  (id) => !!id && init(id),
);

watch(
  () => defaultConfig.value,
  (val) => !!val && emit('change', val),
);
</script>
<template>
  <Popover
    placement="rightBottom"
    v-model:open="visible"
    :mouse-leave-delay="0"
    :trigger="disabled ? 'manual' : 'click'"
    :z-index="calcZIndex()"
  >
    <template #title>
      <span>模型列表</span>
    </template>
    <template #content>
      <div class="h-[300px] w-[300px] overflow-y-scroll" v-loading="isLoading">
        <Tree
          show-icon
          @expand="onExpand"
          :tree-data="dataList"
          :expanded-keys="expandedKeys"
          :field-names="{
            children: 'models',
            title: 'title',
            key: 'key',
          }"
          v-model:selected-keys="selectedKeys"
          @select="handleSelect"
        >
          <template #title="{ title, key, models }">
            <span @click="toggle(key, models)">
              {{ title }}
            </span>
          </template>
          <template #icon="{ icon_small, models }">
            <img
              v-if="!models"
              class="mr-[10px] mt-[5px] w-[16px]"
              :src="`${icon_small}?_token=${accessStore.accessToken}`"
            />
          </template>
        </Tree>
      </div>
    </template>
    <Button
      :disabled="disabled"
      class="relative max-w-[150px] overflow-hidden"
      :loading="!configs?.model_name"
    >
      <template v-if="configs?.model_name">
        <!-- <div class="mr-[10px] truncate pr-[5px]">
          {{ `${configs?.model_name}&nbsp;|&nbsp;${configs?.parentName}` }}
        </div> -->
        <div class="truncate pr-[15px]">
          {{ configs?.model_name }}
        </div>
        <span
          class="icon-[ph--caret-up-down] absolute right-[12px] top-[8px] scale-[1.2]"
        ></span>
      </template>
      <span v-else class="text-[12px]">模型加载中...</span>
    </Button>
  </Popover>
</template>
