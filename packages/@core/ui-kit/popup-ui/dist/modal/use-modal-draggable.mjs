import { onBeforeUnmount, onMounted, reactive, ref, watchEffect } from "vue";
import { unrefElement } from "@vueuse/core";
export function useModalDraggable(targetRef, dragRef, draggable) {
  const transform = reactive({
    offsetX: 0,
    offsetY: 0
  });
  const dragging = ref(false);
  const onMousedown = (e) => {
    const downX = e.clientX;
    const downY = e.clientY;
    if (!targetRef.value) {
      return;
    }
    const targetRect = targetRef.value.getBoundingClientRect();
    const { offsetX, offsetY } = transform;
    const targetLeft = targetRect.left;
    const targetTop = targetRect.top;
    const targetWidth = targetRect.width;
    const targetHeight = targetRect.height;
    const docElement = document.documentElement;
    const clientWidth = docElement.clientWidth;
    const clientHeight = docElement.clientHeight;
    const minLeft = -targetLeft + offsetX;
    const minTop = -targetTop + offsetY;
    const maxLeft = clientWidth - targetLeft - targetWidth + offsetX;
    const maxTop = clientHeight - targetTop - targetHeight + offsetY;
    const onMousemove = (e2) => {
      let moveX = offsetX + e2.clientX - downX;
      let moveY = offsetY + e2.clientY - downY;
      moveX = Math.min(Math.max(moveX, minLeft), maxLeft);
      moveY = Math.min(Math.max(moveY, minTop), maxTop);
      transform.offsetX = moveX;
      transform.offsetY = moveY;
      if (targetRef.value) {
        targetRef.value.style.transform = `translate(${moveX}px, ${moveY}px)`;
        dragging.value = true;
      }
    };
    const onMouseup = () => {
      dragging.value = false;
      document.removeEventListener("mousemove", onMousemove);
      document.removeEventListener("mouseup", onMouseup);
    };
    document.addEventListener("mousemove", onMousemove);
    document.addEventListener("mouseup", onMouseup);
  };
  const onDraggable = () => {
    const dragDom = unrefElement(dragRef);
    if (dragDom && targetRef.value) {
      dragDom.addEventListener("mousedown", onMousedown);
    }
  };
  const offDraggable = () => {
    const dragDom = unrefElement(dragRef);
    if (dragDom && targetRef.value) {
      dragDom.removeEventListener("mousedown", onMousedown);
    }
  };
  const resetPosition = () => {
    transform.offsetX = 0;
    transform.offsetY = 0;
    const target = unrefElement(targetRef);
    if (target) {
      target.style.transform = "none";
    }
  };
  onMounted(() => {
    watchEffect(() => {
      if (draggable.value) {
        onDraggable();
      } else {
        offDraggable();
      }
    });
  });
  onBeforeUnmount(() => {
    offDraggable();
  });
  return {
    dragging,
    resetPosition,
    transform
  };
}
