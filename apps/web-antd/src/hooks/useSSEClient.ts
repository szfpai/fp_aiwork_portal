import { onUnmounted, ref } from 'vue';

import { useRxWorkerQueue } from './useRxWorkerQueue'; // 你已有的队列hook

export function useSSEClient() {
  const messages = ref<string[]>([]);
  const error = ref<Error | null>(null);
  const isConnected = ref(false);

  const { enqueue, cancel } = useRxWorkerQueue();

  let currentTaskId: null | string = null;

  // 处理 worker 发来的消息
  const messageHandler = (msg: any) => {
    switch (msg.type) {
      case 'close': {
        isConnected.value = false;

        break;
      }
      case 'error': {
        error.value = new Error('SSE连接错误');
        isConnected.value = false;

        break;
      }
      case 'message': {
        messages.value.push(msg.data);

        break;
      }
      // No default
    }
  };

  // 启动 SSE
  async function start(url: string) {
    if (isConnected.value) return;
    messages.value = [];
    error.value = null;

    // 传递给 worker 的 payload，一般是调用 start 的参数
    const payload = url;

    const observable = enqueue(payload, {
      messageHandler,
      // 任务 id 便于取消
      id: 'sse-task',
      // 任务执行时调用 worker 的 start 方法
      // useRxWorkerQueue 应该内置对 Worker 方法的调用，这里假设 enqueue 会自动调用 worker 的 start(payload)
    });

    const subscription = observable.subscribe({
      next: () => {
        isConnected.value = true;
      },
      error(err) {
        error.value = err;
        isConnected.value = false;
      },
      complete() {
        isConnected.value = false;
      },
    });

    currentTaskId = 'sse-task';
  }

  // 停止 SSE
  function stop() {
    if (!isConnected.value || !currentTaskId) return;
    cancel(currentTaskId);
    isConnected.value = false;
  }

  onUnmounted(() => {
    stop();
  });

  return {
    messages,
    error,
    isConnected,
    start,
    stop,
  };
}
