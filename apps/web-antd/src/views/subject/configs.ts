import type { VbenFormSchema } from '@vben/common-ui';

import type { VxeGridProps } from '#/adapter/vxe-table';

import { h } from 'vue';

import dayjs from 'dayjs';

import { z } from '#/adapter/form';

interface TableRowData {
  id: number;
  name: string;
  modifyTime: string;
  modifyUser: string;
  fileSize: string;
  version: string;
  parentId?: null | number;
  type: string;
  hasChild: boolean;
}

export interface RowType {
  id: number;
  name: string;
  modifyTime: string;
  modifyUser: string;
  fileSize: string;
  version: string;
  parentId?: null | number;
  type: string;
  hasChild: boolean;
}

// 模拟后台
export const fetchChildListApi = (parentRow: TableRowData) => {
  return new Promise<TableRowData[]>((resolve) => {
    setTimeout(() => {
      const childs = [];
      for (let j = 1; j < 5; j++) {
        childs.push({
          id: Number(`${parentRow.id}${j}`),
          name: `${parentRow.name}${j}`,
          modifyTime: `${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
          modifyUser: `Test${parentRow.id}${parentRow.id}${j}`,
          fileSize: `${Math.floor(Math.random() * 1000)}KB`,
          version: `1.0.0`,
          parentId: parentRow.id,
          type: 'file',
          hasChild: false,
        });
      }
      resolve(childs);
    }, 1000);
  });
};

// 模拟后台
export const fetchData = () => {
  return new Promise<TableRowData[]>((resolve) => {
    setTimeout(() => {
      const childs: any[] = Array.from({ length: 6 })
        .fill({})
        .map((_, index) => ({
          id: index + 1,
          title: '知识库使用指南',
          author: '张三',
          date: '05月19日',
          useCount: 1,
          contentCount: 1,
          type: index % 2 === 0 ? 'team' : 'personal',
          avatar: `https://picsum.photos/100/100?t=${index}`,
          name: 'Get达人',
        }));
      resolve(childs);
    }, 1000);
  });
};

export const MOCK_TABLE_DATA: TableRowData[] = (() => {
  const data: TableRowData[] = [];
  for (let i = 1; i < 10; i++) {
    data.push({
      id: i,
      name: `Test${i}`,
      modifyTime: `${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
      modifyUser: `Test${i}`,
      fileSize: `${Math.floor(Math.random() * 1000)}KB`,
      version: `1.0.0`,
      type: 'directory',
      hasChild: true,
      parentId: null,
    });
  }
  return data;
})();

export const dropDownOptions = [
  {
    key: 'add',
    label: '新建文件夹',
    type: ['directory'],
    icon: 'icon-[iconamoon--file-add] mr-[5px]',
  },
  /*   {
    key: 'move',
    label: '移动',
    // type: ['file'],
    icon: 'icon-[mynaui--move-vertical] mr-[5px]',
  }, */
  {
    key: 'edit',
    label: '编辑',
    type: ['directory'],
    icon: 'icon-[iconamoon--edit] mr-[5px]',
  },
  {
    key: 'delete',
    label: '删除',
    className: 'text-[#f5222d]',
    // type: ['directory', 'file'],
    icon: 'icon-[material-symbols--delete-outline] mr-[5px] text-[red]',
  },
];

export const tabTabPanes = [
  {
    key: '1',
    label: '全部',
  },
  /*   {
    key: '2',
    label: '笔记',
    count: 30,
    className: 'flex items-center gap-[6px]',
  },
  {
    key: '3',
    label: '文件',
    count: 13,
    className: 'flex items-center gap-[6px]',
  }, */
];

export const columns: any[] = [
  {
    type: 'checkbox',
    width: 40,
  },
  {
    field: 'name',
    showOverflow: true,
    title: '名称',
    treeNode: true,
    slots: {
      default: 'status_name',
    },
    align: 'left',
  },
  {
    field: 'fileSize',
    showOverflow: true,
    align: 'left',
    title: '文件大小',
    slots: { default: 'file_size' },
  },
  {
    field: 'action',
    slots: { default: 'action' },
    title: '操作',
    width: 80,
    align: 'center',
  },
];

export const subjectDropDownOptions = [
  {
    key: 'edit',
    label: '编辑',
    icon: 'icon-[iconamoon--edit] mr-[5px]',
  },
  /* {
    key: 'delete',
    label: '删除',
    className: 'text-[#f5222d]',
  }, */
];

export const subjectSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      placeholder: '输入知识库名称，例如：写作灵感库',
      allowClear: true,
      size: 'large',
      maxLength: 256,
      required: true,
    },
    fieldName: 'name',
    label: '知识库名称',
    rules: z.string().min(1, { message: '知识库名称不能为空' }),
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      size: 'large',
      class: 'w-full',
      options: [],
      fieldNames: {
        label: 'label',
        value: 'value',
      },
      placeholder: '选择部门',
    },
    fieldName: 'dpt_id',
    label: '部门',
    rules: z.string().min(1, { message: '请选择部门' }),
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '描述下你的知识库，例如：收集日常观察、有趣的对话、突发奇想',
      allowClear: true,
      size: 'large',
      rows: 5,
    },
    fieldName: 'description',
    label: '描述信息',
  },
];

interface UploadFileParams {
  file: File;
  onError?: (error: Error) => void;
  onProgress?: (progress: { percent: number }) => void;
  onSuccess?: (data: any, file: File) => void;
}

export async function upload_file({
  file,
  onError,
  onProgress,
  onSuccess,
}: UploadFileParams) {
  try {
    onProgress?.({ percent: 0 });

    const data = file;

    onProgress?.({ percent: 100 });
    onSuccess?.(data, file);
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

export const fileSchema: VbenFormSchema[] = [
  {
    component: 'Upload',
    hideLabel: true,
    componentProps: {
      // 更多属性见：https://ant.design/components/upload-cn
      // accept: '.png,.jpg,.jpeg',
      // 自动携带认证信息
      // customRequest: upload_file,
      disabled: false,
      // maxCount: 1,
      // multiple: false,
      showUploadList: true,
      // 上传列表的内建样式，支持四种基本样式 text, picture, picture-card 和 picture-circle
      // listType: 'text',
      // className: 'w-full min-h-[180px]',
    },
    fieldName: 'files',
    defaultValue: [
      {
        uid: '-1',
        name: 'xxx.png',
        status: 'done',
        url: 'http://www.baidu.com/xxx.png',
      },
    ],
    renderComponentContent: () => {
      return {
        default: () =>
          h(
            'div',
            {
              class:
                'w-full h-full p-[50px] rounded-[20px] border-[2px] border-[#adb3be] border-dashed',
            },
            h('div', { class: 'text-center' }, [
              h(
                'div',
                { class: 'text-[#292d34] text-[14px]' },
                '将文件拖动到此处或点击上传',
              ),
              h(
                'p',
                { class: 'text-[#8a8f99] text-[12px] my-[10px]' },
                '支持上传 PDF、DOC、DOCX、PPT、PPTX 文件类型',
              ),
              h(
                'p',
                { class: 'text-[#8a8f99] text-[12px]' },
                '单个文件大小不超过 200MB ',
              ),
            ]),
          ),
      };
    },
  },
];

export const menuOptions = [
  [
    {
      code: 'add',
      name: '新建文件夹',
      prefixIcon: 'vxe-icon-add',
      type: ['directory'],
    },
    {
      code: 'move',
      name: '删除',
      prefixIcon: 'vxe-icon-delete',
      type: ['directory', 'file'],
    },
    {
      code: 'move',
      name: '移动',
      prefixIcon: 'vxe-icon-move',
      type: ['directory', 'file'],
    },
    {
      code: 'edit',
      name: '编辑',
      prefixIcon: 'vxe-icon-edit',
      type: ['directory', 'file'],
    },
    {
      code: 'delete',
      name: '删除',
      prefixIcon: 'vxe-icon-delete',
      type: ['directory', 'file'],
    },
  ],
];

export const gridTableOptions: VxeGridProps<RowType> = {
  columns,
  pagerConfig: {
    enabled: true,
  },
  keepSource: true,
  // proxyConfig: {
  //   ajax: {
  //     query: async ({ page, sort }) => {
  //       console.warn('🚀 ~ query: ~ page, sort:', page, sort);
  //       /* return await getExampleTableApi({
  //         page: page.currentPage,
  //         pageSize: page.pageSize,
  //         sortBy: sort.field,
  //         sortOrder: sort.order,
  //       }); */
  //       return new Promise((resolve) => {
  //         setTimeout(() => {
  //           resolve({
  //             items: MOCK_TABLE_DATA,
  //             total: MOCK_TABLE_DATA.length,
  //           });
  //         }, 1000);
  //       });
  //     },
  //   },
  //   sort: true,
  // },
  sortConfig: {
    defaultSort: { field: 'modifyTime', order: 'desc' },
    remote: true,
  },
  // treeConfig: {
  //   parentField: 'parentId',
  //   rowField: 'id',
  //   transform: true,
  //   showLine: false,
  //   lazy: true,
  //   hasChild: 'hasChild',
  //   loadMethod({ row }) {
  //     // 异步加载子节点
  //     return fetchChildListApi(row);
  //   },
  // },
  rowConfig: {
    isHover: true,
    isCurrent: true, // 高亮当前行
    keyField: 'id',
    useKey: true,
    drag: true,
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    slots: {
      tools: 'tools',
    },
  },
  checkboxConfig: {
    showHeader: false,
    reserve: true,
    checkStrictly: true, // 勾选父或子会自动联动
  },
  rowDragConfig: {
    showIcon: true,
    showDragTip: true,
    trigger: 'cell',
    isPeerDrag: true,
    isCrossDrag: true,
    isToChildDrag: true,
    isSelfToChildDrag: true,
    animation: true,
    disabledMethod: ({ row }) => false,
  },
};

export const fileActionOptions = [
  {
    title: '写笔记',
    name: '写笔记',
    icon: 'icon-[line-md--edit]',
    type: 'write',
    description: '记录现在的想法',
  },
  {
    title: '选择笔记',
    name: '选择已有笔记',
    icon: 'icon-[mdi--note-edit-outline]',
    type: 'select',
    description: '从已有的笔记中选择笔记添加',
  },
  {
    title: '生成一条链接笔记',
    name: '粘贴链接',
    icon: 'icon-[line-md--link]',
    type: 'link',
    description: '公众号文章、抖音短视频、得到直播回放等',
  },
  {
    title: '生成一条图片笔记',
    name: '上传图片',
    icon: 'icon-[ion--image-outline]',
    type: 'image',
    description: '课堂笔记、白板记录、旅行风景等',
  },
];

export const dirSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      placeholder: '输入文件夹名称，最长50个字',
      allowClear: true,
      size: 'large',
      maxLength: 50,
      required: true,
    },
    fieldName: 'name',
    label: '文件夹名称',
    rules: z.string().min(1, { message: '文件夹名称不能为空' }),
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '请输入描述信息',
      allowClear: true,
      size: 'large',
      rows: 5,
    },
    fieldName: 'description',
    label: '描述信息',
  },
];
/*

<!-- <TabPane key="1">
        <template #tab>全部</template>
        <div :class="$style.content" v-if="activeKey === '1'">
          <Grid>
            <template #tools>
              <Button class="mr-[12px]" :disabled="isAddDir">
                新建文件夹
              </Button>
              <Button class="mr-[12px]" :disabled="isDel">移动</Button>
              <Button :disabled="isDel">删除</Button>
            </template>
            <template #status_default="{ row }">
              <div class="flex items-center">
                <span
                  class="mr-[5px] text-[20px] text-[#02acf3]"
                  :class="{
                    ['icon-[clarity--directory-solid]']:
                      row.type === 'directory',
                    ['icon-[mdi-light--file]']: row.type === 'file',
                  }"
                >
                </span>
                <span>{{ row.name }}</span>
              </div>
            </template>
            <template #action="{ row }">
              <Dropdown
                placement="bottomRight"
                :options="dropDownOptions"
                class-name="flex items-center mx-[auto]"
                @click="handleClick"
                :filter-options="
                  (v: any) => v.filter((i: any) => i.type.includes(row.type))
                "
              />
            </template>
          </Grid>
        </div>
      </TabPane>
      <TabPane key="2">
        <template #tab>
          <div class="flex items-center gap-[6px]">
            <span>笔记</span>
            <Tag color="default">30</Tag>
          </div>
        </template>
        <div :class="$style.content" v-if="activeKey === '2'">
          <div :class="$style.content_title">笔记</div>
        </div>
      </TabPane>
      <TabPane key="3">
        <template #tab>
          <div class="flex items-center gap-[6px]">
            <span>文件</span>
            <Tag color="default">13</Tag>
          </div>
        </template>
        <div :class="$style.content" v-if="activeKey === '3'">
          <div :class="$style.content_title">文件</div>
        </div>
      </TabPane> -->
*/
