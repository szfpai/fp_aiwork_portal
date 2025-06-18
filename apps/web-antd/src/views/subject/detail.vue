<!-- eslint-disable unicorn/no-array-reduce -->
<script setup lang="ts">
import type { RowType } from './configs';

import type { VxeGridListeners, VxeGridProps } from '#/adapter/vxe-table';

import { computed, h, onMounted, reactive, ref, shallowRef, unref } from 'vue';
import { useRoute } from 'vue-router';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  Button,
  message,
  Modal,
  Space,
  TabPane,
  Tabs,
  Tag,
} from 'ant-design-vue';
import isEmpty from 'lodash/isEmpty';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createTask,
  deleteNote,
  deleteSubject,
  getAutomationList,
  getNoteList,
  getSubjectList,
} from '#/api';
import Dropdown from '#/components/Dropdown/index.vue';
import useVxeTableContextMenuHighlight from '#/hooks/useVxeTableContextMenuHighlight';
import { useAssStore } from '#/store';
import {
  getFileIconByType,
  getFileSize,
  getFileTypeByMimeOrName,
} from '#/utils';
import NoteForm from '#/views/note/components/document.vue';
import Preview from '#/views/note/components/preview.vue';

import InDirForm from './components/dirForm.vue';
import FileForm from './components/modalFile.vue';
import { dropDownOptions, gridTableOptions, tabTabPanes } from './configs';

const baseUrl = import.meta.env.VITE_GLOB_API_URL;

const route = useRoute();

const activeKey = ref('1');

const previewImgs = shallowRef<any[]>([]);

const automationList = shallowRef<any>({});

const [PreviewDrawer, previewApi] = useVbenDrawer({
  connectedComponent: Preview,
});

const state = reactive({
  loading: false,
  dataList: [] as any[],
  taskLoading: false,
});

const defaultConfigs = {
  auto_structured: false,
  // description: '',
  dpt_id: route.query?.dpt_id ?? '',
  is_folder: true,
  kb_type: 'unstructured',
  language: 'Chinese',
  parser_id: 'naive',
  pid: route.params?.id ?? '',
  folder_creation_limit: false,
};

const assStore = useAssStore();
const checkBoxList = ref<any[]>([]);
const isAddDir = computed(() => {
  if (isEmpty(unref(checkBoxList))) return false;
  return unref(checkBoxList).every(
    (item: any) => !!item?.is_folder || !!item?._is_folder,
  );
});
const isDel = computed(() => {
  if (isEmpty(unref(checkBoxList))) return false;
  return unref(checkBoxList).every(
    (item: any) => !(!!item?.is_folder || !!item?._is_folder),
  );
});

const [InFileModal, inFileModalApi] = useVbenModal({
  connectedComponent: FileForm,
  onBeforeClose: () => {
    const data: any = inFileModalApi.getData();
    if (data?.default) {
      setTimeout(() => {
        assStore.assInstance
          ?.setData({ key: 'task', default: data?.default })
          .open();
      }, 16);
    }
    return true;
  },
});

const [InNoteModal, inNoteModalApi] = useVbenModal({
  connectedComponent: NoteForm,
});

const [InDirModal, inDirModalApi] = useVbenModal({
  connectedComponent: InDirForm,
});

const gridOptions: VxeGridProps<RowType> = {
  ...gridTableOptions,
  // 绑定右键菜单事件
  // menuConfig: {
  //   className: '',
  //   body: {
  //     options: menuOptions,
  //   },
  //   visibleMethod({ options, row }) {
  //     // 设置当前行为选中行
  //     initInstanceRef(unref(gridApi).grid);
  //     setCurrentRow(row);
  //     // 这里可以判断权限、角色、行数据状态等
  //     options.forEach((group) => {
  //       group.forEach((item) => {
  //         item.visible = item?.type?.includes(row?.type);
  //       });
  //     });
  //     return true; // 返回 true 表示显示右键菜单
  //   },
  // },
  treeConfig: {
    parentField: 'parentId',
    rowField: 'id',
    transform: true,
    showLine: false,
    lazy: true,
    hasChild: 'hasChild',
    loadMethod: async ({ row }: any) => {
      try {
        // 异步加载子节点
        return await refresh(row?.is_folder ? 'folder' : 'file', row?.id);
      } catch (error) {
        console.warn('🚀 ~ loadMethod ~ error:', error);
        return [];
      }
    },
  },
  proxyConfig: {
    ajax: {
      query: async (): Promise<any> => {
        try {
          const items = await refresh();
          return {
            items,
            total: items.length,
          };
        } catch (error) {
          console.warn('🚀 ~ refresh ~ error:', error);
          return [];
        }
      },
    },
    sort: true,
  },
};

const gridEvents: VxeGridListeners<RowType> = {
  cellClick: ({ row, rowIndex }: any) => {
    const $grid = unref(gridApi).grid;
    setTimeout($grid.clearCurrentRow, 500);
    if (!row?.is_folder) {
      const type = getFileTypeByMimeOrName(row?.file?.name);
      if (type === 'image') {
        const imgRef: HTMLElement | null = document.querySelector(
          `.preview-img${rowIndex}`,
        );
        !!imgRef && imgRef.click();
        return;
      }
      if (type === 'markdown') {
        previewApi
          .setData({ title: row?.file?.name, url: row?.file?.url })
          .open();
      }
      // router.push(`/note/detail/${row.id}`);
      return;
    }
    const isExpanded = $grid.isTreeExpandByRow(row);
    if (isExpanded) {
      $grid.setTreeExpand(row, false);
      return;
    }
    // $grid.clearRowExpand(); // 如果你只想展开一个，可以加这行
    $grid.setTreeExpand(row, true);
  },
  checkboxChange: ({ records }: any) => {
    checkBoxList.value = records;
  },
  menuClick(e: any) {
    console.warn('🚀 ~ contextMenu:', e);
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridEvents, gridOptions });

const { initInstanceRef, setCurrentRow } = useVxeTableContextMenuHighlight();

const handleDelete = async (row: any) => {
  try {
    const id = row?.is_folder ? row?.id : route.params?.id;
    const actions = row?.is_folder ? deleteSubject : deleteNote;
    const data = row?.is_folder ? {} : { doc_ids: [row?.id] };
    await actions(id, data);
    message.success('删除成功');
    gridApi.reload();
  } catch (error) {
    console.warn('🚀 ~ handleDelete ~ error:', error);
  }
};

const handleDocDelete = async () => {
  // noteId: string, doc_ids: string[]
  Modal.warning({
    title: '温馨提示',
    content: '您确定要删除这些文件吗？',
    okText: '确定',
    cancelText: '取消',
    centered: true,
    closable: true,
    maskClosable: false,
    onOk: async () => {
      try {
        await deleteNote(route.params?.id as string, {
          doc_ids: unref(checkBoxList).map((item: any) => item.id),
        });
        message.success('删除成功');
        gridApi.reload();
      } catch (error) {
        console.warn('🚀 ~ handleDelete ~ error:', error);
      }
    },
  });
};

const handleClick = (e: any, row: any) => {
  const { key } = e?.item?._payload ?? {};
  if (key === 'delete') {
    Modal.warning({
      title: '温馨提示',
      content: h('span', {}, [
        h('span', {}, `您确定要删除${row.is_folder ? '文件夹' : '文件'}`),
        h(
          'span',
          {
            class: 'text-[red]',
          },
          `${row.name ?? row?.file?.name ?? '-'}?`,
        ),
      ]),
      okText: '确定',
      cancelText: '取消',
      centered: true,
      closable: true,
      maskClosable: false,
      onOk: async () => await handleDelete(row),
    });
    return;
  }
  if (key === 'edit') {
    if (row?.is_folder || row?._is_folder) {
      createDir({
        id: row?.id ?? '',
        ...defaultConfigs,
        allow_kb_folder_updated: true,
        avatar: row?.avatar ?? null,
        embedding_model: row?.embedding_model ?? null,
        embedding_model_provider: row?.embedding_model_provider ?? null,
        parser_config: row?.parser_config ?? null,
        reranking_model: row?.reranking_model ?? null,
        reranking_model_provider: row?.reranking_model_provider ?? null,
        similarity_threshold: row?.similarity_threshold ?? null,
        vector_similarity_weight: row?.vector_similarity_weight ?? null,
        pid: row?.pid ?? '',
        name: row?.name ?? '',
        description: row?.description ?? '',
        dpt_id: row?.department?.id ?? '',
      });
      return;
    }
    inNoteModalApi
      .setData({
        row,
        doc_id: row?.id,
        noteId: route.params?.id,
        refresh: () => gridApi.reload(),
      })
      .open();
    return;
  }
  if (key === 'add') {
    createDir({
      ...defaultConfigs,
      pid: row?.id ?? '',
      dpt_id: row?.department?.id ?? '',
    });
  }
};

const handleCreateTask = async (type: string) => {
  const data = unref(checkBoxList)[0];
  const params =
    type === 'file_translation' ? [{ value: 'en', variable: 'lang' }] : [];
  if (!data) return;
  try {
    state.taskLoading = true;
    message.loading('创建中...', 3000);
    await Promise.all(
      unref(checkBoxList).map((item: any) =>
        createTask(automationList.value[type]?.id, {
          inputs: [
            {
              value: item?.id,
              variable: 'doc_id',
            },
            ...params,
            { value: item?.file?.name ?? '', variable: 'task_name' },
            { variable: 'corpus' },
          ],
        }),
      ),
    );
    message.destroy();
    message.success('创建成功');
    assStore.assInstance?.setData({ key: 'task' }).open();
  } catch (error) {
    console.warn('🚀 ~ handleCreateTask ~ error:', error);
  } finally {
    state.taskLoading = false;
  }
};

const refresh = async (type?: string, id?: string) => {
  try {
    const file_type = type ?? route.query?.type ?? '';
    const pid = id ?? route.params?.id ?? '';
    if (!pid || !file_type) return [];
    state.loading = true;
    const dirs = await getSubjectList({
      pid,
      one_depth: true,
      dpt_id: '',
      keyword: '',
      name: '',
    });
    const docAndDir = (dirs?.data ?? []).map((item: any) => ({
      ...item,
      hasChild: true,
      _is_folder: true,
    }));
    if (file_type === 'file') {
      const notes = await getNoteList(pid as string);
      docAndDir.push(
        ...(notes?.data ?? []).map((item: any) => ({
          ...item,
          hasChild: item?.is_folder ?? false,
        })),
      );
    }
    return docAndDir;
  } catch (error) {
    console.warn('🚀 ~ refresh ~ error:', error);
    throw error;
  } finally {
    state.loading = false;
  }
};

const filterOptions = (v: any, row: any) => {
  const isFolder = row?.is_folder ?? false;
  return v.filter((d: any) => {
    const type = d?.type;
    if (!type) return true;
    if (type.includes('directory')) return isFolder;
    if (type.includes('file')) return !isFolder;
    return true;
  });
};

const createDir = async (row: any = defaultConfigs) => {
  try {
    inDirModalApi
      .setData({
        row,
        refresh: () => gridApi.reload(),
      })
      .open();
  } catch (error) {
    console.error('🚀 ~ createDir ~ error:', error);
  }
};

const handleActions = () => {
  inFileModalApi
    .setData({
      id: route.params?.id ?? '',
      dpt_id: route.query?.dpt_id ?? '',
      refresh: () => gridApi.reload(),
    })
    .open();
};

onMounted(async () => {
  try {
    const res = await getAutomationList();
    const match = import.meta.env.VITE_ATUO_MATIONS.split(',');
    automationList.value = (res?.data ?? []).reduce((acc: any, item: any) => {
      if (match.includes(item?.name)) acc[item?.name] = item;
      return acc;
    }, {});
  } catch (error) {
    console.warn('🚀 ~ onMounted ~ error:', error);
  }
});
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header" class="pb-[10px]">
      <div :class="$style.title">知识库使用指南</div>
      <div :class="$style.description">让记录和管理知识变得前所未有的轻松</div>
    </div>
    <Tabs
      size="large"
      :animated="false"
      class="mt-[10px]"
      v-model:active-key="activeKey"
    >
      <TabPane v-for="item of tabTabPanes" :key="item.key">
        <template #tab>
          <div
            class="flex items-center gap-[6px]"
            v-if="item.className?.trim()"
          >
            <span>{{ item.label }}</span>
            <Tag color="default">{{ item.count }}</Tag>
          </div>
          <span v-else>{{ item.label }}</span>
        </template>
        <div :class="$style.content" v-if="activeKey === '1'">
          <Grid>
            <template #tools>
              <Space :size="12">
                <Button
                  v-if="isDel"
                  :loading="state.taskLoading"
                  @click="handleCreateTask('file_translation')"
                >
                  翻译
                </Button>
                <Button
                  v-if="isDel"
                  :loading="state.taskLoading"
                  @click="handleCreateTask('file_interpretation')"
                >
                  解读
                </Button>
                <Button
                  :loading="state.taskLoading"
                  :disabled="true"
                  @click="handleCreateTask"
                >
                  对比
                </Button>
                <Button
                  :loading="state.taskLoading"
                  :disabled="true"
                  @click="handleCreateTask"
                >
                  合订
                </Button>
                <!-- v-if="route.query?.type === 'folder'" -->
                <Button @click="() => createDir()">新建文件夹</Button>
                <Button @click="handleActions">添加</Button>
                <!-- <Button :disabled="isDel" @click="handleCreateTask">移动</Button> -->
                <Button v-if="isDel" @click="handleDocDelete"> 删除 </Button>
              </Space>
            </template>
            <template #status_name="{ row, rowIndex }">
              <div class="flex items-center">
                <img
                  v-viewer
                  v-if="getFileTypeByMimeOrName(row?.file?.name) === 'image'"
                  v-show="false"
                  :src="`${baseUrl}${row?.file?.url}`"
                  ref="previewImgs"
                  :class="`preview-img${rowIndex}`"
                />
                <span
                  class="mr-[5px] text-[18px] text-[#02acf3]"
                  :class="{
                    ['icon-[clarity--directory-solid]']:
                      !!row?.is_folder || !!row?._is_folder,
                    [getFileIconByType(row?.file?.extension)]: !(
                      !!row?.is_folder || !!row?._is_folder
                    ),
                  }"
                >
                </span>
                <span>{{ row?.name ?? row?.file?.name ?? '-' }}</span>
              </div>
            </template>
            <template #file_size="{ row }">
              <span>{{
                !!row?.is_folder || !!row?._is_folder
                  ? '-'
                  : getFileSize(row?.file?.size)
              }}</span>
            </template>
            <template #action="{ row }">
              <Dropdown
                placement="bottomRight"
                :options="dropDownOptions"
                class-name="flex items-center mx-[auto]"
                @click="(e: any) => handleClick(e, row)"
                :filter-options="(v: any) => filterOptions(v, row)"
              />
            </template>
          </Grid>
        </div>
        <!-- <div :class="$style.content" v-if="activeKey === '2'">
          <div :class="$style.content_title">笔记</div>
        </div>
        <div :class="$style.content" v-if="activeKey === '3'">
          <div :class="$style.content_title">文件</div>
        </div> -->
      </TabPane>
    </Tabs>
    <InFileModal />
    <InDirModal />
    <InNoteModal />
    <PreviewDrawer />
  </div>
</template>
<style module lang="less">
.container {
  padding: 15px;
  .header {
    .title {
      color: #111418;
      font-weight: 600;
      font-size: 32px;
    }
    .description {
      color: #677084;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  }
  :global {
    .ant-tabs-tab {
      padding: 10px 0 !important;
      .ant-tabs-nav {
        &::before {
          border-bottom: none;
        }
      }
    }
    .vxe-grid {
      padding: 0 !important;
      .vxe-grid--toolbar-wrapper {
        .vxe-toolbar {
          background-color: #f1f3f6 !important;
        }
      }
      .vxe-body--row {
        cursor: pointer;
      }
      // .vxe-cell--tree-node {
      //   padding-left: 0px !important;
      // }
      .vxe-toolbar {
        overflow-x: auto;
      }
    }
  }
}
</style>
