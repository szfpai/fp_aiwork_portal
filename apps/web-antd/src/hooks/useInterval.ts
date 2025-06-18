import type { Ref } from 'vue';

import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
  unref,
} from 'vue';

export interface UseInterval {
  status: Ref<boolean>;
  resume: (loop?: boolean) => void;
  pause: () => void;
  time: (t: number) => void;
  count: Ref<number>;
  reset: () => void;
}

export function isNumber(value: number): boolean {
  return typeof value === 'number' && !Number.isNaN(value);
}

export default function useInterval(
  cb: () => Promise<void>,
  interval: number = 1000,
  options: { immediate?: boolean; loop?: boolean; maxCount?: number } = {},
): UseInterval {
  if (typeof cb !== 'function') {
    console.warn('arguments: cb is not a function');
    return {} as UseInterval;
  }
  const { immediate = false, loop = true, maxCount } = options;
  if (!isNumber(interval)) {
    console.warn('arguments: interval is not a number');
    return {} as UseInterval;
  }

  const [timer, time, newLoop, status, count] = [
    shallowRef<ReturnType<typeof setTimeout> | undefined>(),
    shallowRef<number>(interval),
    shallowRef<boolean>(loop),
    ref<boolean>(false),
    shallowRef<number>(0),
  ];

  if (getCurrentScope()) onScopeDispose(clean);

  function clean() {
    status.value = false;
    if (!timer.value) return;
    clearTimeout(timer.value);
    timer.value = void 0;
  }

  function reset() {
    clean();
    count.value = 0;
  }

  async function run() {
    try {
      await cb.apply(null);
      count.value++;
    } catch (error) {
      console.error('[useInterval] callback error:', error);
    }
  }

  async function tick() {
    if (!status.value) return;
    await run();
    if ((maxCount !== void 0 && count.value >= maxCount) || !newLoop.value) {
      return;
    }
    timer.value = setTimeout(tick, unref(time));
  }

  function start(l?: boolean) {
    if (status.value) return;
    if (timer.value) clearTimeout(timer.value);
    if (typeof l === 'boolean') newLoop.value = l;
    status.value = true;
    timer.value = setTimeout(tick, unref(time));
  }

  if (immediate) {
    run().then(() => start());
  }

  return {
    status: computed(() => status.value),
    resume: start,
    pause: clean,
    time: (t: number) => isNumber(t) && (time.value = t),
    count: computed(() => count.value),
    reset,
  };
}
