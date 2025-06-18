type TaskStatus = 'cancelled' | 'fulfilled' | 'idle' | 'pending' | 'rejected';

interface QueueTask<T = any> {
  id: string;
  task: () => Promise<T>;
  status: TaskStatus;
  result?: T;
  error?: Error;
  resolve?: () => void;
  cancel?: () => void;
  pause?: () => void;
  progress?: number;
  resume?: () => void;
  [key: string]: any;
}

export function useQueue(workerLimit = 2) {
  const tasks = new Map<string, QueueTask>();
  const queue: QueueTask[] = [];
  let [activeCount, paused] = [0, false];

  const runNext = async () => {
    if (paused || activeCount >= workerLimit || queue.length === 0) return;
    const next = queue.shift() as QueueTask | undefined;
    if (!next) return;
    next.status = 'pending';
    activeCount++;
    try {
      const result = await next.task();
      next.status = 'fulfilled';
      next.result = result;
    } catch (error) {
      if (next.status !== 'cancelled') {
        next.status = 'rejected';
        next.error = error;
      }
    } finally {
      activeCount--;
      next.resolve?.();
      runNext();
    }
  };

  const add = (
    id: string,
    task: () => Promise<any>,
    extra?: Partial<QueueTask>,
  ) => {
    if (tasks.has(id)) return;
    let resolve: () => void;
    const p = new Promise<void>((r) => (resolve = r));
    const newTask: QueueTask = {
      id,
      task,
      status: 'idle',
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      resolve: resolve!,
      ...extra,
    };
    tasks.set(id, newTask);
    queue.push(newTask);
    runNext();
    return p;
  };

  const retry = (id: string) => {
    const task = tasks.get(id);
    if (!task || task.status === 'pending') return;
    task.status = 'idle';
    queue.push(task);
    runNext();
  };

  const cancel = (id: string) => {
    const task = tasks.get(id);
    if (task) {
      task.status = 'cancelled';
      task?.cancel?.();
      tasks.delete(id);
      // 移除 queue 中的等待任务
      const index = queue.findIndex((t) => t.id === id);
      if (index !== -1) queue.splice(index, 1);
    }
  };

  const pauseAll = () => {
    paused = true;
    for (const task of tasks.values()) {
      if (task.status === 'pending') task.pause?.();
    }
  };

  const resumeAll = () => {
    paused = false;
    for (const task of tasks.values()) {
      if (task.status === 'idle') task.resume?.();
    }
    runNext();
  };

  const remove = (id: string) => {
    tasks.delete(id);
    // 移除 queue 中的等待任务
    const index = queue.findIndex((t) => t.id === id);
    if (index !== -1) queue.splice(index, 1);
  };

  const clear = () => {
    queue.length = 0;
    tasks.clear();
  };

  return {
    add,
    retry,
    remove,
    cancel,
    clear,
    pauseAll,
    resumeAll,
    getTask: (id: string) => tasks.get(id),
    getAllTasks: () => [...tasks.values()],
    isPaused: () => paused,
    getActiveCount: () => activeCount,
    getQueueSize: () => queue.length,
  };
}
