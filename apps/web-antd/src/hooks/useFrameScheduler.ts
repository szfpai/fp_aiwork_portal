/* eslint-disable @typescript-eslint/no-invalid-void-type */
type TaskFn = () => boolean | Promise<boolean | void> | void;

interface FrameSchedulerOptions {
  frameBudget?: number; // 每帧预算（默认 16.67ms）
  autoStart?: boolean;
}

export function useFrameScheduler(options: FrameSchedulerOptions = {}) {
  const { frameBudget = 16.67, autoStart = true } = options;

  const queue: TaskFn[] = [];
  let rafId: null | number = null;
  let paused = false;

  const runFrame = (timestamp: DOMHighResTimeStamp) => {
    if (paused) return;

    const startTime = performance.now();

    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) break;

      try {
        const result = task();
        if (result instanceof Promise) {
          // 异步任务：等下个帧
          result.finally(() => requestNextFrame());
          return;
        }

        // task 返回 false 说明请求停止
        if (result === false) break;
      } catch (error) {
        console.error('[FrameScheduler] Task Error:', error);
      }

      // 帧预算用尽，等下一帧
      if (performance.now() - startTime >= frameBudget) {
        break;
      }
    }

    requestNextFrame();
  };

  const requestNextFrame = () => {
    cancelNextFrame(); // 保证不会重复请求
    rafId = requestAnimationFrame(runFrame);
  };

  const cancelNextFrame = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const enqueue = (task: TaskFn) => {
    queue.push(task);
    if (!paused && rafId === null) {
      requestNextFrame();
    }
  };

  const clear = () => {
    queue.length = 0;
    cancelNextFrame();
  };

  const pause = () => {
    paused = true;
    cancelNextFrame();
  };

  const resume = () => {
    if (!paused) return;
    paused = false;
    requestNextFrame();
  };

  // 自动启动
  if (autoStart) requestNextFrame();

  return {
    enqueue,
    pause,
    resume,
    clear,
    getQueueSize: () => queue.length,
    isPaused: () => paused,
  };
}

/*

onMounted(() => {
  const scheduler = useFrameScheduler();

  largeList.forEach(item => {
    scheduler.enqueue(() => renderItem(item));
  });
});


scheduler.enqueue(async () => {
  await doSomething();
  console.log('异步任务完成');
});

const scheduler = useFrameScheduler({ frameBudget: 8 }); // 严格控制预算

// 添加多个任务
for (let i = 0; i < 1000; i++) {
  scheduler.enqueue(() => {
    console.log('执行任务', i);
  });
}
*/
