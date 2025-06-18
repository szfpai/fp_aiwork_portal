import { nextTick, ref } from 'vue';

import { useThrottleFn } from '@vueuse/core';
import isFunction from 'lodash/isFunction';
import { Node } from 'slate';

export function useAutoScrollToEnd() {
  const editorInstance = ref<any>(null);
  const editorContainer = ref<HTMLElement | null>(null); // 实际 DOM 容器

  function handleCreated(editor: any) {
    editorInstance.value = editor;
    editorContainer.value = editor.getEditableContainer();
  }

  function isCursorAtEnd(): boolean {
    const editor = editorInstance.value;
    if (!editor || !editor.selection) return false;

    const { selection, children } = editor;
    if (!selection || children.length === 0) return false;

    const lastNode = children[children.length - 1];
    const lastText = Node.string(lastNode);
    const lastTextLength = lastText.length;

    const { focus } = selection;
    return (
      focus.path[0] === children.length - 1 && focus.offset === lastTextLength
    );
  }

  function scrollToBottom() {
    const container = editorContainer.value;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }

  function scrollCursorIntoView() {
    const container = editorContainer.value;
    const selection = window.getSelection();
    if (!container || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const domNode = range?.endContainer?.parentElement;

    if (
      domNode &&
      container.contains(domNode) &&
      isFunction(domNode.scrollIntoView)
    ) {
      domNode.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
    }
  }

  const handleChange = useThrottleFn(() => {
    nextTick(() => {
      if (isCursorAtEnd()) {
        scrollToBottom();
        return;
      }
      scrollCursorIntoView();
    });
  }, 200);

  return {
    handleCreated,
    handleChange,
  };
}
