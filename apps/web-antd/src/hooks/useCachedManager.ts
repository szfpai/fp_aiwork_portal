import { computed, ref } from 'vue';

export interface CachedItemOptions {
  delay?: number; // 延迟隐藏时间（ms）
  destroyOnHide?: boolean; // 隐藏后是否销毁
}

interface CachedItemState {
  visible: boolean;
  destroyed: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

export default function useCachedManager() {
  const cacheMap = ref<Record<string, CachedItemState>>({});

  function ensureKey(key: string) {
    if (!cacheMap.value[key]) {
      cacheMap.value[key] = { visible: false, destroyed: false };
    }
  }

  function show(key: string, options: CachedItemOptions = {}) {
    // 先确保所有其他 key 隐藏
    Object.keys(cacheMap.value).forEach((k) => {
      if (k !== key && cacheMap.value[k]) {
        cacheMap.value[k].visible = false;
      }
    });
    ensureKey(key);
    const item = cacheMap.value[key];
    if (!item) return;
    clearTimeout(item.timer);
    item.visible = true;
    item.destroyed = options.destroyOnHide ?? false;
  }

  function hide(key: string, options: CachedItemOptions = {}) {
    ensureKey(key);
    const item = cacheMap.value[key];
    if (!item) return;
    clearTimeout(item.timer);
    if (options.delay) {
      item.timer = setTimeout(() => {
        item.visible = false;
        item.destroyed = options.destroyOnHide ?? false;
      }, options.delay);
      return;
    }
    item.visible = false;
    item.destroyed = options.destroyOnHide ?? false;
  }

  function toggle(key: string, options: CachedItemOptions = {}) {
    const item = cacheMap.value[key];
    if (!item) return;
    if (item?.visible) {
      hide(key, options);
      return;
    }
    show(key, options);
  }

  function reset(key: string) {
    const item = cacheMap.value[key];
    if (item?.timer) {
      clearTimeout(item.timer);
    }
    cacheMap.value[key] = { visible: false, destroyed: false };
  }

  function getState(key: string) {
    ensureKey(key);
    return computed(() => {
      const item = cacheMap.value[key];
      return {
        visible: item?.visible ?? false,
        keepAlive: !item?.destroyed,
      };
    });
  }

  // 清理函数
  function cleanup(): void {
    Object.values(cacheMap.value).forEach((item) => {
      if (item?.timer) clearTimeout(item.timer);
    });
    cacheMap.value = {};
  }

  return {
    show,
    hide,
    toggle,
    reset,
    cleanup,
    getState,
  };
}
