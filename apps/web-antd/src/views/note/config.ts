import type { VbenFormSchema } from '@vben/common-ui';

import dayjs from 'dayjs';

import { z } from '#/adapter/form';

// 模拟后台
export const fetchChildListApi = () => {
  return new Promise<any[]>((resolve) => {
    setTimeout(() => {
      const childs = [
        {
          id: 1,
          content: '今天',
          date: dayjs().format('YYYY-MM-DD'),
          children: [
            {
              id: 11,
              content: '今天的内容',
              date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            },
          ],
        },
        {
          id: 2,
          content: '昨天',
          date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
          children: [
            {
              id: 21,
              content: '昨天内容',
              date: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
            },
          ],
        },
        {
          id: 3,
          content: '过去7天',
          date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
          children: [
            {
              id: 31,
              content: '过去7天内容',
              date: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
            },
          ],
        },
        {
          id: 4,
          content: '更早',
          date: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
          children: [
            {
              id: 41,
              content: '更早内容',
              date: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
            },
          ],
        },
      ];
      resolve(childs);
    }, 1000);
  });
};

export const handleActions = [
  {
    url: 'https://piccdn2.umiwi.com/fe-oss/default/MTcyMTM4MjkxNTE0.png',
    tag: 'https://piccdn2.umiwi.com/fe-oss/default/MTcyMTM4MzM4OTU1.png',
    name: '添加图片',
    description: 'AI智能识别',
    onClick: (state: any) => (state.isAddImg = true),
  },
  {
    url: 'https://piccdn2.umiwi.com/fe-oss/default/MTcyMTM4MjkxNDgw.png',
    tag: 'https://piccdn2.umiwi.com/fe-oss/default/MTcyMTM4MzM4OTU1.png',
    name: '添加链接',
    description: 'AI智能分析',
    onClick: (state: any) => (state.isAddLink = true),
  },
  /*   {
    url: 'https://piccdn2.umiwi.com/fe-oss/default/MTcyMTk3NzYxNTI1.png',
    name: '唤起助手',
    description: 'AI助手',
    onClick: () => {
      console.warn('唤起助手');
    },
  }, */
];

export const dropDownOptions = [
  /*   {
    key: 'copy',
    label: '复制',
    disabled: true,
    hidden: true,
  }, */
  {
    key: 'edit',
    label: '编辑',
    icon: 'icon-[iconamoon--edit] mr-[5px]',
  },
  {
    key: 'add',
    label: '添加到知识库',
    icon: 'icon-[iconamoon--file-add] mr-[5px]',
  },
  {
    key: 'delete',
    label: '删除',
    className: 'text-[#f5222d]',
    icon: 'icon-[material-symbols--delete-outline] mr-[5px] text-[red]',
  },
];

export const noteSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入标题',
      allowClear: true,
      size: 'large',
      maxLength: 256,
      required: true,
    },
    fieldName: 'title',
    label: '标题',
    rules: z.string().min(1, { message: '标题不能为空' }),
  },
  {
    controlClass: '222222222',
    formItemClass: '3333333333',
    wrapperClass: 'flex-col items-start',
    component: 'Editor',
    componentProps: {
      placeholder: '描述下你的知识库，例如：收集日常观察、有趣的对话、突发奇想',
      allowClear: true,
      size: 'large',
      height: 300,
      toolbarClass: 'order-1',
      class: 'order-2 w-full !h-[300px]',
    },
    fieldName: 'content',
    label: '笔记',
    rules: z.string().min(1, { message: '笔记不能为空' }),
  },
];
