import type { Ref } from 'vue';

import { computed, ref, unref } from 'vue';

import isEmpty from 'lodash/isEmpty';

// 任务状态类型
export type TaskStatus =
  | 'cancelled' // 已取消
  | 'fulfilled' // 成功完成
  | 'idle' // 等待执行
  | 'pending' // 执行中
  | 'rejected'; // 执行失败

// 队列任务接口
export interface QueueTask<T = any> {
  id: string; // 唯一任务 ID
  task: (fn?: (p: number) => any) => Promise<T>; // 任务执行函数，返回 Promise
  status: TaskStatus; // 当前状态（响应式）
  result?: T; // 成功结果
  error?: any; // 错误信息
  retryCount: number; // 当前重试次数
  retryDelay?: number; // 重试延迟，单位 ms
  maxRetry: number; // 最大可重试次数
  priority: number; // 优先级（高优先级先执行）
  progress?: number; // 可选进度值（0-100）
  resolve: () => void; // 完成后用于外部等待 Promise 的触发器
  reject: (error: unknown) => void; // 失败后用于外部等待 Promise 的触发器
  cancel?: () => void; // 自定义取消钩子
  pause?: () => void; // 自定义暂停钩子
  resume?: () => void; // 自定义恢复钩子
  onStart?: () => void; // 任务开始钩子
  onSuccess?: (result: T) => void; // 任务成功钩子
  onError?: (error: any) => void; // 任务失败钩子
  onComplete?: () => void; // 任务完成（成功/失败）钩子
  onProgress?: (progress: number) => void;
  controller: AbortController; // 控制器（用于取消任务）
  [key: string]: any; // 其他扩展字段
}

export type QueueTaskInput = {
  reject?: never;
  resolve?: never;
  status?: never; // 明确禁止 status 字段
} & Partial<Omit<QueueTask, 'id' | 'retryCount' | 'status' | 'task'>>;

export default function useQueueManager(workerLimit = 1) {
  // 所有任务的 Map 集合
  const tasks = ref<Map<string, Ref<QueueTask>>>(new Map());
  // 使用 Set 存储已完成任务的 ID，用于快速查找
  const completedTasks = ref<Set<string>>(new Set());
  // 待执行队列
  const queue = ref<Ref<QueueTask>[]>([]);
  // 当前并发执行数
  const activeCount = ref<number>(0);
  // 是否暂停所有任务
  const paused = ref<boolean>(false);

  // 定期清理已完成任务
  const scheduleCleanup = (): void => {
    if (completedTasks.value.size > 1000) {
      for (const id of completedTasks.value) {
        tasks.value.delete(id);
      }
      completedTasks.value.clear();
    }
  };

  // 在任务完成时标记
  const markTaskCompleted = (id: string): void => {
    completedTasks.value.add(id);
    scheduleCleanup();
  };

  /**
   * 更新任务进度
   */
  const updateProgress = (id: string, progress: number): void => {
    const task = unref(tasks).get(id) as Ref<QueueTask> | undefined;
    if (!task || !task.value) return;
    // 确保进度在 0-100 之间
    const p = Math.max(0, Math.min(100, progress));
    task.value.progress = p;
    task.value.onProgress?.(p);
  };

  // 插入队列
  const insertTaskWithPriority = (task: Ref<QueueTask>) => {
    const idx = queue.value.findIndex(
      (t) => (t.value.priority || 0) < (task.value.priority || 0),
    );
    if (idx === -1) queue.value.push(task);
    else queue.value.splice(idx, 0, task);
  };

  /**
   * 内部方法：执行队列中的下一个任务
   */
  const runNext = async (): Promise<any> => {
    if (
      unref(paused) || // 已暂停
      unref(activeCount) >= workerLimit || // 超过最大并发数
      isEmpty(unref(queue)) // 队列为空
    ) {
      return;
    }

    // 按优先级排序（大的优先）
    queue.value.sort(
      (a: Ref<QueueTask>, b: Ref<QueueTask>) =>
        (b.value.priority ?? 0) - (a.value.priority ?? 0),
    );
    const task = queue.value.shift() as Ref<QueueTask> | undefined;
    if (!task || !task.value) return;
    task.value.status = 'pending';
    task.value.onStart?.(); // 调用开始钩子
    activeCount.value++;
    try {
      // const result = await task.value.task(); // 执行任务
      // 如果任务函数接受回调，则调用时传入
      let result: Promise<any>;
      // eslint-disable-next-line unicorn/prefer-ternary
      if (task.value.task.length > 0) {
        // 任务函数参数长度大于0，传入进度回调
        result = await task.value.task((p: number) => {
          updateProgress(task.value.id, p);
        });
      } else {
        result = await task.value.task();
      }
      task.value.status = 'fulfilled';
      task.value.result = result;
      task.value.onSuccess?.(result); // 成功回调
      markTaskCompleted(task.value.id); // 标记任务完成
    } catch (error) {
      // 非取消状态下，标记失败
      if (!['cancelled'].includes(task.value.status)) {
        /* task.value.status = 'rejected';
        task.value.error = error;
        task.value.onError?.(error); // 失败回调 */
        // 如果可重试，则重新入队
        if (task.value.retryCount < task.value.maxRetry) {
          task.value.retryCount++;
          task.value.status = 'idle';
          // queue.value.push(task);
          setTimeout(
            () => insertTaskWithPriority(task),
            task.value.retryDelay ?? 0,
          );
        } else {
          task.value.status = 'rejected';
          task.value.error = error;
          task.value.onError?.(error); // 失败回调
          markTaskCompleted(task.value.id); // 重试次数用完，标记完成
        }
      }
    } finally {
      activeCount.value--;
      task.value.onComplete?.();
      task.value.resolve?.(); // 唤醒 add 返回的 Promise
      // 使用 Promise 确保在微任务队列中执行下一个任务
      Promise.resolve().then(runNext);
    }
  };

  /**
   * 添加单个任务
   */
  const add = (
    id: string,
    taskFn: (fn?: (p: number) => any) => Promise<any>,
    options: QueueTaskInput = {},
    force = false,
  ): undefined | { promise: Promise<any>; task: Ref<QueueTask> } => {
    // const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    if (!force && unref(tasks).has(id)) return;
    let [resolve, reject] = [() => {}, () => {}];
    const p = new Promise<void>((r, j) => {
      resolve = r;
      reject = j;
    });
    const task = ref<QueueTask>({
      maxRetry: 0,
      priority: 0,
      retryDelay: 0,
      ...options,
      id,
      task: taskFn,
      resolve,
      reject,
      status: 'idle',
      progress: 0, // 添加进度
      retryCount: 0,
      controller: new AbortController(),
    });
    tasks.value.set(id, task);
    // queue.value.push(task);
    insertTaskWithPriority(task);
    runNext();
    return { task, promise: p };
  };

  /**
   * 批量添加任务
   */
  const addBatch = (
    entries: {
      id: string;
      options?: Partial<
        Omit<QueueTask, 'id' | 'retryCount' | 'status' | 'task'>
      >;
      task: () => Promise<any>;
    }[],
  ): any[] => {
    return entries.map(({ id, task, options }) => add(id, task, options));
  };

  /**
   * 手动重试某任务
   */
  const retry = (id: string): void => {
    const task = unref(tasks).get(id) as Ref<QueueTask> | undefined;
    if (!task || !task.value || task.value.status === 'pending') return;
    task.value.status = 'idle';
    // queue.value.push(task);
    insertTaskWithPriority(task);
    runNext();
  };

  /**
   * 取消某任务（从任务表和队列中移除）
   */
  const cancel = (id: string, force = true): void => {
    const task = unref(tasks).get(id) as Ref<QueueTask> | undefined;
    if (task && task.value) {
      task.value.controller.abort();
      task.value.status = 'cancelled';
      task.value.reject?.(new Error('Task cancelled'));
      task.value.cancel?.();
      tasks.value.delete(id);
      if (!force) return;
      const i = queue.value.findIndex((t) => t.value.id === id);
      if (i !== -1) queue.value.splice(i, 1);
    }
  };

  /**
   * 暂停所有任务
   */
  const pauseAll = (): void => {
    paused.value = true;
    for (const task of unref(tasks).values()) {
      if (unref(task.value.status) === 'pending') task.value.pause?.();
    }
  };

  /**
   * 恢复所有任务
   */
  const resumeAll = (): void => {
    paused.value = false;
    for (const task of unref(tasks).values()) {
      if (task.value.status === 'idle') task.value.resume?.();
    }
    runNext();
  };

  /**
   * 清空所有任务与队列
   */
  const clear = (): void => {
    queue.value.length = 0;
    tasks.value.clear();
    // 清理已完成任务集合
    completedTasks.value.clear();
  };

  /**
   * 清空所有正在执行和队列中的任务，但保留记录
   */
  const flush = (): void => {
    queue.value.length = 0;
    for (const task of tasks.value.values()) {
      if (['idle', 'pending'].includes(task.value.status)) {
        task.value.status = 'cancelled';
      }
    }
    // 清理已完成任务集合
    completedTasks.value.clear();
  };

  /**
   * 移除某任务（仅从任务表中）
   */
  const remove = (id: string, force = true): void => {
    // 从任务映射表中移除
    tasks.value.delete(id);
    if (!force) return;
    // 查找是否在队列中
    const i = queue.value.findIndex((t) => t.value.id === id);
    // 如果在队列中则移除
    if (i !== -1) queue.value.splice(i, 1);
  };

  /**
   * 导出任务状态
   */
  const exportTasks = (): QueueTask[] => {
    return [...tasks.value.values()].map((t) => ({ ...t.value }));
  };

  /**
   * 导入任务状态
   */
  const importTasks = (taskList: QueueTask[]): void => {
    for (const t of taskList) {
      const taskRef = ref(t) as Ref<QueueTask>;
      tasks.value.set(t.id, taskRef);
      if (t.status === 'idle') insertTaskWithPriority(taskRef);
    }
  };

  return {
    add,
    addBatch,
    retry,
    cancel,
    remove,
    clear,
    pauseAll,
    resumeAll,
    getTask: (id?: string) => {
      return id ? unref(tasks).get(id) : [...unref(tasks).values()];
    },
    hasTask: (id: string) => unref(tasks).has(id),
    // 暴露底层状态（可用于 UI 控制与展示）
    taskMap: tasks,
    queue,
    activeCount,
    paused,
    total: computed(() => unref(tasks).size),
    getTasksStatus: (status: TaskStatus) => {
      return computed(() =>
        [...unref(tasks).values()].filter((t) => t.value.status === status),
      );
    },
    flush,
    updateProgress, // 导出更新进度的方法
    exportTasks,
    importTasks,
  };
}
