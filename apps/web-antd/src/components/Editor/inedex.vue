<script setup lang="ts">
import type { Ref } from 'vue';

import { onBeforeUnmount, ref, shallowRef, unref, watch } from 'vue';

// @ts-ignore
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import isFunction from 'lodash/isFunction';

import '@wangeditor/editor/dist/css/style.css'; // 引入 css

interface Props {
  /**
   * 模式
   */
  mode?: string;
  /**
   * 内容
   */
  modelValue?: string;
  /**
   * 是否显示工具栏
   */
  showToolbarFlag?: boolean;
  /**
   * 是否只读
   */
  readOnlyFlag?: boolean;
  /**
   * 编辑器类名
   */
  editorClass?: any;
  /**
   * 工具栏类名
   */
  toolbarClass?: any;
  /**
   * 编辑器配置
   */
  editorConfig?: any;
  /**
   * 工具栏配置
   */
  toolbarConfig?: any;

  onCreated?: (editor: any) => void;
}

// Props：使用属性，子组件接收父组件传递的内容
const props = withDefaults(defineProps<Props>(), {
  mode: 'default',
  modelValue: '',
  showToolbarFlag: true,
  readOnlyFlag: false,
  editorClass: '',
  toolbarClass: '',
  containerClass: '',
  editorConfig: {},
  toolbarConfig: {},
  onCreated: () => {},
});

// Emits：使用事件，将子组件内容传递给父组件。父组件使用 update:model-value(modelValue: string)
const emit = defineEmits<{
  (e: 'update:model-value', modelValue: string): void;
}>();

const mode: Ref<string> = ref<string>(props.mode);

// 编辑器实例，必须用 shallowRef
const editorRef: Ref<any> = shallowRef<any>();

const toolbarConfig: any = {
  toolbarKeys: [
    'insertImage',
    'bold',
    'italic',
    'underline',
    'blockquote', // 引用按钮
    // 列表相关
    'bulletedList', // 无序列表
    'numberedList', // 有序列表
  ],
  ...props.toolbarConfig,
};

// 配置
const editorConfig = {
  placeholder: '记录现在的想法...',
  MENU_CONF: {
    uploadImage: {
      // form-data fieldName ，默认值 'wangeditor-uploaded-image'。传给后端接口的参数名，重要!
      fieldName: 'file',
      server: 'http://localhost:8080/files/wangEditorUpload', // 修改为你的上传接口
    },
  },
  ...props.editorConfig,
};

const handleCreated = (editor: any) => {
  editorRef.value = editor; // 记录 editor 实例，重要！

  // 根据父组件传递的readOnlyFlag，设置编辑器为只读
  props.readOnlyFlag ? editor.disable() : editor.enable();

  isFunction(props.onCreated) && props.onCreated(editor);
};

defineExpose({
  getInstance: () => unref(editorRef),
});

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  unref(editorRef)?.destroy();
});

watch(
  () => props.mode,
  (newVal: string) => {
    mode.value = newVal;
  },
);
</script>

<template>
  <Editor
    :mode="mode"
    :model-value="props.modelValue"
    @update:model-value="emit('update:model-value', $event)"
    @on-created="handleCreated"
    :default-config="editorConfig"
    :read-only="readOnlyFlag"
    :class="editorClass"
    style="height: initial"
    v-bind="$attrs"
  />
  <Toolbar
    v-if="showToolbarFlag"
    :editor="editorRef"
    :default-config="toolbarConfig"
    :mode="mode"
    :class="toolbarClass"
  />
  <slot></slot>
</template>
