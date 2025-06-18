import { onBeforeUnmount } from 'vue';

export default function useVxeTableContextMenuHighlight() {
  let gridRef: any = null;
  let observer: MutationObserver | null = null;
  let currentRow: any = null;

  const initInstanceRef = (ref: any) => {
    destroy();
    gridRef = ref;
    const wrapper = document.querySelector(
      '.vxe-table--context-menu-wrapper',
    ) as HTMLElement;
    if (!wrapper) return;

    observer = new MutationObserver(() => {
      const isVisible = wrapper.classList.contains('is--visible');
      isVisible && setCurrentRow(currentRow);
      !isVisible && clearCurrentRow();
    });

    observer.observe(wrapper, {
      attributes: true,
      attributeFilter: ['class'],
    });
  };

  const setCurrentRow = (row: any) => {
    currentRow = row;
    gridRef?.setCurrentRow?.(row);
  };

  const clearCurrentRow = () => {
    currentRow = null;
    gridRef?.clearCurrentRow?.();
  };

  const destroy = () => {
    observer?.disconnect();
    observer = null;
    gridRef = null;
    currentRow = null;
  };

  onBeforeUnmount(destroy);

  return {
    initInstanceRef,
    setCurrentRow,
    clearCurrentRow,
  };
}
