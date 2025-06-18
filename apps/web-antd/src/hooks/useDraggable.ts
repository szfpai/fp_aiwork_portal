import type { ComponentPublicInstance, ComputedRef, Ref } from 'vue';

import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';

import { unrefElement } from '@vueuse/core';

export default function useDraggable(
  targetRef: Ref<ComponentPublicInstance | HTMLElement | undefined>,
  dragRef?: Ref<ComponentPublicInstance | HTMLElement | undefined>,
  draggable: ComputedRef<boolean> = computed(() => true),
) {
  const offsetX = ref(0);
  const offsetY = ref(0);
  const dragging = ref(false);

  let cleanupFns: (() => void)[] = [];

  const resolveElement = (refOrEl: any): HTMLElement | null => {
    const el = unrefElement(refOrEl);
    if (el) return el;
    if (refOrEl?.$el instanceof HTMLElement) return refOrEl.$el;
    return null;
  };

  const updatePosition = (
    clientX: number,
    clientY: number,
    startX: number,
    startY: number,
  ) => {
    const moveX = clientX - startX;
    const moveY = clientY - startY;
    offsetX.value += moveX;
    offsetY.value += moveY;

    const target = resolveElement(targetRef);
    if (target) {
      target.style.transform = `translate(${offsetX.value}px, ${offsetY.value}px)`;
    }
  };

  const onDragStart = (event: MouseEvent | TouchEvent) => {
    const target = resolveElement(targetRef);
    if (!target) return;

    const isTouch = event instanceof TouchEvent;
    const point: any = isTouch ? event.touches[0] : (event as MouseEvent);
    let startX = point.clientX;
    let startY = point.clientY;
    let moved = false;

    dragging.value = true;
    target.style.cursor = 'move';
    target.style.willChange = 'transform';

    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const movePoint: any =
        e instanceof TouchEvent ? e.touches[0] : (e as MouseEvent);
      const dx = movePoint.clientX - startX;
      const dy = movePoint.clientY - startY;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        moved = true;
      }

      updatePosition(movePoint.clientX, movePoint.clientY, startX, startY);
      startX = movePoint.clientX;
      startY = movePoint.clientY;
    };

    const endHandler = (e: MouseEvent | TouchEvent) => {
      dragging.value = false;
      target.style.cursor = '';
      target.style.willChange = '';

      if (moved) {
        const preventClick = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          document.removeEventListener('click', preventClick, true);
        };
        document.addEventListener('click', preventClick, true);
      }

      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler);
    document.addEventListener('touchend', endHandler);

    cleanupFns.push(() => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    });
  };

  const bindDraggable = () => {
    const dragEl = dragRef
      ? resolveElement(dragRef)
      : resolveElement(targetRef);
    if (!dragEl) return;
    dragEl.style.cursor = 'grab';
    dragEl.addEventListener('mousedown', onDragStart);
    dragEl.addEventListener('touchstart', onDragStart, { passive: false });

    cleanupFns.push(() => {
      dragEl.removeEventListener('mousedown', onDragStart);
      dragEl.removeEventListener('touchstart', onDragStart);
    });
  };

  const resetPosition = () => {
    offsetX.value = 0;
    offsetY.value = 0;
    const target = resolveElement(targetRef);
    if (target) {
      target.style.transform = 'none';
    }
  };

  onMounted(() => {
    watchEffect(() => {
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
      if (draggable.value) {
        bindDraggable();
      }
    });
  });

  onBeforeUnmount(() => {
    cleanupFns.forEach((fn) => fn());
  });

  return {
    offsetX,
    offsetY,
    dragging,
    resetPosition,
  };
}
