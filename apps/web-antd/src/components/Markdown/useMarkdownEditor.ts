import { defineComponent, h, shallowRef } from 'vue';

import mavonEditor from 'mavon-editor';

import 'mavon-editor/dist/css/index.css';

export function useMavonEditor() {
  // 编辑器组件实例引用
  const editorRef = shallowRef<typeof mavonEditor.mavonEditor>();

  const VEditor = defineComponent({
    name: 'VEditor',
    // 让组件支持 v-model 绑定
    props: {
      modelValue: {
        type: String,
        default: '',
      },
      // 可选的预览渲染函数
      previewRender: {
        type: Function,
        default: null,
      },
    },
    emits: ['update:modelValue'],
    setup(props, { attrs, emit }) {
      return () =>
        h(
          mavonEditor.mavonEditor,
          {
            ref: editorRef,
            modelValue: props.modelValue,
            'onUpdate:modelValue': (val: string) => {
              emit('update:modelValue', val);
            },
            previewRender: props.previewRender || undefined,
            // 额外的props透明传递
            ...attrs,
          },
          {},
        );
    },
  });

  return [VEditor, editorRef];
}
