import type { UploadFile, UploadProps } from 'ant-design-vue';

import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  ref,
  shallowRef,
  unref,
} from 'vue';

import { Button, message, UploadDragger } from 'ant-design-vue';

export interface UseVbenUploadOptions {
  maxSize?: number; // 单文件大小限制（MB）
  accept?: string[]; // MIME 类型限制
  maxCount?: number; // 最大上传文件数
  uploadProps?: UploadProps; // AUpload 属性
  checkFileContent?: (file: File) => Promise<boolean>; // 内容检查
  onChange?: (files: UploadFile[]) => void;
  onSuccess?: (file: UploadFile, res: any) => void;
  slots?: Record<string, (params?: any) => any>;
  [key: string]: any;
}

export function useVbenUpload(options: UseVbenUploadOptions = {}) {
  const fileList = ref<UploadFile[]>([]);
  const config = shallowRef(options);
  const uploadRef: any = ref<InstanceType<typeof UploadDragger>>();
  const publicApi: Record<string, any> = {};

  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    const { maxSize, accept, maxCount, checkFileContent } = unref(config);
    if (maxSize && file.size / 1024 / 1024 > maxSize) {
      message.error?.(`文件大小不能超过 ${maxSize}MB`);
      return 'LIST_IGNORE';
    }
    if (accept && !accept.includes(file.type)) {
      message.error?.(`不支持的文件类型: ${file.type}`);
      return 'LIST_IGNORE';
    }
    if (maxCount && fileList.value.length >= maxCount) {
      message.warning?.(`最多只能上传 ${maxCount} 个文件`);
      return 'LIST_IGNORE';
    }
    if (checkFileContent) {
      const valid = await checkFileContent(file);
      if (!valid) {
        message.error?.('文件内容不合法');
        return 'LIST_IGNORE';
      }
    }
    return true;
  };

  const UploadComponent = defineComponent({
    name: 'VbenUploadDragger',
    inheritAttrs: false, // 可选，防止 attrs 覆盖原有属性
    emits: ['update:fileList'],
    setup(props, { attrs, emit, slots: vueSlots, expose }) {
      onMounted(async () => {
        await nextTick();
        const refVal = unref(uploadRef);
        for (const key in refVal) {
          if (typeof refVal[key] === 'function') {
            publicApi[key] = refVal[key];
          }
        }
      });
      const handleSlots: Record<string, (params?: any) => any> = {};
      const slotKeys = new Set([
        ...Object.keys(unref(config).slots ?? {}),
        ...Object.keys(vueSlots),
      ]);
      slotKeys.forEach((key) => {
        handleSlots[key] = (params?: any) =>
          vueSlots[key]?.(params) ??
          unref(config).slots?.[key]?.(params) ??
          (key === 'default' ? h(Button, {}, '上传文件') : null);
      });
      expose(publicApi);
      return () =>
        h(
          UploadDragger,
          {
            ref: uploadRef,
            ...unref(config).uploadProps,
            ...props,
            fileList: unref(fileList),
            beforeUpload,
            'onUpdate:fileList': (fl: UploadFile[]) => (fileList.value = fl),
            onChange: (info: any) => {
              emit('update:fileList', info.fileList);
              fileList.value = info.fileList;
              // 通知外部变更
              unref(config).onChange?.(info?.fileList);

              // 上传完成（不论默认或自定义）
              if (info?.file.status === 'done') {
                unref(config).onSuccess?.(info?.file, info?.file.response);
              }
              // 上传失败
              if (info?.file.status === 'error') {
                unref(config).onError?.(info?.file, info?.file.error);
              }
            },
            ...attrs,
          },
          {
            ...handleSlots,
          },
        );
    },
  });

  const api = {
    open: () => {
      nextTick(() => {
        const input = unref(uploadRef)?.$el?.querySelector(
          'input[type="file"]',
        ) as HTMLInputElement;
        input?.click();
      });
    },
    getFileList: () => unref(fileList),
    setFileList: (list: UploadFile[]) => (fileList.value = list),
    clear: () => (fileList.value = []),
    api: publicApi,
  };

  return [UploadComponent, api] as const;
}
