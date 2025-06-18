import isEmpty from 'lodash/isEmpty';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

// 任务状态类型
type TaskStatusType =
  | 'cancelled' // 任务被取消
  | 'error' // 任务失败
  | 'paused' // 任务暂停
  | 'queued' // 任务排队中
  | 'running' // 任务运行中
  | 'success' // 任务成功完成
  | 'waiting'; // 任务等待依赖完成

// 任务接口定义
export interface Task<T = any, R = any> {
  id: string; // 任务唯一 ID
  payload: T; // 任务输入数据
  paused: boolean; // 任务是否处于暂停状态
  retryCount: number; // 当前重试次数
  maxRetries: number; // 最大重试次数
  timeout?: number; // 任务超时时间（ms）
  controller: AbortController; // 用于取消任务的控制器
  priority: number; // 任务优先级，数值越大优先级越高
  resolve: (res: R) => void; // 任务完成时的 Promise resolve
  reject: (err: any) => void; // 任务失败时的 Promise reject
  dependencies?: string[]; // 依赖的其他任务 ID 列表
  dependents?: Set<string>; // 依赖当前任务的任务 ID 集合
}

// 任务状态数据结构
export interface TaskStatus {
  id: string; // 任务 ID
  status: TaskStatusType; // 当前任务状态
  retryCount: number; // 当前重试次数
  [key: string]: any;
}

// Worker 池类，用于复用 Worker 减少创建销毁开销
export class WorkerPool {
  private busyWorkers = new Set<Worker>();
  private maxSize: number;
  private pool: Worker[] = [];
  private workerUrl: URL;

  constructor(workerUrl: URL, maxSize: number) {
    this.workerUrl = workerUrl;
    this.maxSize = maxSize;
  }

  // 获取可用 Worker，若无则新建，超出最大数量则抛错
  acquire(): Worker {
    const freeWorker = this.pool.find((w) => !this.busyWorkers.has(w));
    if (freeWorker) {
      this.busyWorkers.add(freeWorker);
      return freeWorker;
    }
    if (this.pool.length < this.maxSize) {
      const w = new Worker(this.workerUrl, { type: 'module' });
      this.pool.push(w);
      this.busyWorkers.add(w);
      return w;
    }
    throw new Error('No available workers in the pool');
  }

  // 释放 Worker，标记为闲置
  release(worker: Worker) {
    this.busyWorkers.delete(worker);
  }

  // 用于真正终止 Worker
  terminate(worker: Worker) {
    worker.terminate();
    this.release(worker);
    const index = this.pool.indexOf(worker);
    if (index !== -1) {
      this.pool.splice(index, 1);
    }
  }

  // 终止所有 Worker，清空池
  terminateAll() {
    this.pool.forEach((w) => w.terminate());
    this.pool = [];
    this.busyWorkers.clear();
  }
}

// 主队列管理函数，传入 worker 脚本路径和最大并发数
export function useRxWorkerQueue(
  workerUrl: URL,
  maxConcurrency: number = 2,
  maxWorkerPoolSize: number = 2,
) {
  // 任务状态 Map，方便快速更新和查询
  const taskStatusMap = new Map<string, TaskStatus>();

  // RxJS 的 Subject
  const taskSubject = new Subject<TaskStatus>();

  // 任务 Map，存储所有任务详情
  const tasksMap = new Map<string, Task>();

  // 当前正在运行的任务 ID 集合
  const runningTasks = new Set<string>();

  // 等待执行的任务队列（优先级排序）
  const waitingQueue: Task[] = [];

  // 取消、暂停、恢复任务的 RxJS Subject 通道
  const cancelSubject = new Subject<string>();
  const pauseSubject = new Subject<string>();
  // const resumeSubject = new Subject<string>();

  // 创建 Worker 池实例
  const workerPool = new WorkerPool(workerUrl, maxWorkerPoolSize);

  // 更新任务状态，推送到 Subject
  function updateTaskStatus(newStatus: TaskStatus) {
    taskStatusMap.set(newStatus.id, newStatus);
    taskSubject.next(newStatus);
  }

  // 判断一个任务的所有依赖是否均已成功完成
  function areDependenciesMet(task: Task) {
    if (!task.dependencies || isEmpty(task.dependencies)) return true;
    return task.dependencies.every((depId) => {
      const status: TaskStatus | undefined = taskStatusMap.get(depId);
      // 若依赖不存在或状态为失败/取消等，不允许运行
      return status && status.status === 'success';
    });
  }

  // 按优先级插入等待队列（优先级越高越靠前）
  function enqueueWaiting(task: Task) {
    if (task.paused) {
      removeTaskFromQueue(waitingQueue, task.id);
      return;
    }
    /* const idx = waitingQueue.findIndex((t) => t.priority < task.priority);
    if (idx === -1) {
      waitingQueue.push(task);
      return;
    }
    // 找到所有同优先级的最后一个
    let insertAt = idx;
    while (insertAt < waitingQueue.length) {
      const queue = waitingQueue[insertAt] as Task;
      if (queue.priority === task.priority) insertAt++;
    }
    waitingQueue.splice(insertAt, 0, task); */

    // 高优先级排前面
    binaryInsert(waitingQueue, task, (a, b) => b.priority - a.priority);
  }

  function removeTaskFromQueue(queue: Task[], taskId: string) {
    const idx = queue.findIndex((t) => t.id === taskId);
    if (idx !== -1) queue.splice(idx, 1);
  }

  // 二分查找
  function binaryInsert<T>(
    tasks: T[],
    task: T,
    compare: (a: T, b: T) => number,
  ) {
    let [left, right] = [0, tasks.length];
    while (left < right) {
      const mid = (left + right) >> 1;
      if (!tasks[mid]) break;
      if (compare(task, tasks[mid]) < 0) {
        // task 优先级高于 tasks[mid]，往左边找插入点
        right = mid;
      } else {
        // task 优先级低或相等，往右边找插入点
        left = mid + 1;
      }
    }
    tasks.splice(left, 0, task);
  }

  // 尝试调度任务，直到达到最大并发数或无可执行任务
  function trySchedule() {
    while (runningTasks.size < maxConcurrency && !isEmpty(waitingQueue)) {
      const task = waitingQueue.shift();
      if (!task || isEmpty(task)) break;
      if (task.paused) {
        // 如果任务暂停，重新入队，继续调度其他任务
        enqueueWaiting(task);
        continue;
      }
      if (!areDependenciesMet(task)) {
        // 依赖未完成，标记等待状态，跳过执行
        updateTaskStatus({
          id: task.id,
          status: 'waiting',
          retryCount: task.retryCount,
        });
        continue;
      }
      // 执行任务
      runTask(task);
    }
  }

  // 运行任务，分配 Worker 并监听状态
  function runTask<T = any, R = any>(task: Task<T, R>) {
    runningTasks.add(task.id);
    updateTaskStatus({
      id: task.id,
      status: 'running',
      retryCount: task.retryCount,
    });

    let worker: Worker;
    try {
      worker = workerPool.acquire();
    } catch {
      // 无空闲 Worker，重新排队等待
      enqueueWaiting(task);
      runningTasks.delete(task.id);
      updateTaskStatus({
        id: task.id,
        status: 'queued',
        retryCount: task.retryCount,
      });
      return;
    }

    // 任务完成事件，用于取消订阅等清理操作
    const taskComplete$ = new Subject<void>();

    // 设置任务超时定时器
    const timeoutId = task.timeout
      ? setTimeout(() => {
          workerPool.terminate(worker);
          runningTasks.delete(task.id);
          handleTaskError(task, new Error('Timeout'));
          trySchedule();
        }, task.timeout)
      : null;

    // 订阅取消事件，触发时中止任务
    cancelSubject
      .pipe(
        filter((id) => id === task.id),
        takeUntil(taskComplete$),
      )
      .subscribe(() => {
        task.controller.abort();
        runningTasks.delete(task.id);
        workerPool.terminate(worker);

        taskComplete$.next();
        taskComplete$.complete();
      });

    // 订阅暂停事件，触发时中止任务并标记暂停
    pauseSubject
      .pipe(
        filter((id) => id === task.id),
        takeUntil(taskComplete$),
      )
      .subscribe(() => {
        // 通知 Worker 中止
        // worker.postMessage({ type: 'abort' });
        task.controller.abort();
        runningTasks.delete(task.id);
        workerPool.terminate(worker);
      });

    // 订阅恢复事件，触发时将任务标记为未暂停并重新排队
    /* resumeSubject
      .pipe(
        filter((id) => id === task.id),
        takeUntil(taskComplete$),
      )
      .subscribe(() => {}); */

    // 监听 Worker 正常完成消息
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    worker.onmessage = (e: any) => {
      /* if (task.payload && isFunction(task.payload?.onmessage)) {
        task.payload?.onmessage?.(e?.data, task);
      } */
      if (timeoutId) clearTimeout(timeoutId);
      const { type, result, error } = e?.data ?? {};
      if (type === 'success') {
        updateTaskStatus({
          id: task.id,
          status: 'success',
          retryCount: task.retryCount,
          result,
          payload: task.payload,
        });
        task.resolve(result);
        checkDependents(task);
      } else if (type === 'error') {
        handleTaskError(task, new Error(error ?? 'Worker Error'));
      } else {
        handleTaskError(task, new Error('Unknown worker message'));
      }
      runningTasks.delete(task.id);
      /* updateTaskStatus({
        id: task.id,
        status: 'success',
        retryCount: task.retryCount,
      });
      task.resolve(e.data);
      checkDependents(task); */
      workerPool.terminate(worker);
      taskComplete$.next();
      taskComplete$.complete();
      trySchedule();
    };

    // 监听 Worker 错误事件
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    worker.onerror = (e: any) => {
      if (timeoutId) clearTimeout(timeoutId);
      runningTasks.delete(task.id);
      handleTaskError(task, e?.error ?? new Error('Worker error'));
      workerPool.terminate(worker);
      taskComplete$.next();
      taskComplete$.complete();
      trySchedule();
    };

    // 通过 postMessage 传递任务数据及取消信号
    const _stringify = JSON.stringify(task.payload);
    worker.postMessage({
      type: 'run',
      taskId: task.id,
      payload: JSON.parse(_stringify),
    });
  }

  // 任务失败处理，判断是否重试或失败结束
  function handleTaskError(task: Task, error: Error) {
    const isRetry = task.retryCount < task.maxRetries;
    updateTaskStatus({
      id: task.id,
      status: isRetry ? 'queued' : 'error',
      retryCount: task.retryCount,
    });
    if (isRetry) {
      task.retryCount++;
      enqueueWaiting(task);
      return;
    }
    task.reject(error);
    checkDependents(task);
  }

  // 检查当前任务的所有依赖任务是否满足，满足则重新入队执行
  function checkDependents(task: Task) {
    task.dependents?.forEach((depId) => {
      const dependentTask = tasksMap.get(depId);
      if (!dependentTask) return;
      if (areDependenciesMet(dependentTask) && !dependentTask.paused) {
        updateTaskStatus({
          id: dependentTask.id,
          status: 'queued',
          retryCount: dependentTask.retryCount,
        });
        enqueueWaiting(dependentTask);
        trySchedule();
      }
    });
  }

  // 添加新任务，返回 Promise，任务完成或失败后 resolve/reject
  function addTask<T = any, R = any>(
    payload: T,
    options?: Partial<{
      dependencies: string[]; // 依赖的任务 ID
      maxRetries: number; // 最大重试次数，默认 0
      paused: boolean; // 是否初始为暂停状态
      priority: number; // 优先级，默认 0
      timeout: number; // 超时毫秒数
    }>,
  ): Promise<R> {
    const id = uuidv4().replaceAll('-', '');
    let resolveFn: (res: R) => void;
    let rejectFn: (err: any) => void;

    const {
      dependencies = [],
      maxRetries = 0,
      timeout,
      paused = false,
      priority = 0,
    } = options ?? {};

    const task: Task<T, R> = {
      id,
      payload,
      paused,
      retryCount: 0,
      maxRetries,
      timeout,
      controller: new AbortController(),
      priority,
      resolve: (res: R) => resolveFn(res),
      reject: (err: any) => rejectFn(err),
      dependencies,
      dependents: new Set(),
    };

    // 维护依赖关系时，应该是让被依赖任务的 dependents 集合中添加当前任务 ID
    dependencies.forEach((depId) => {
      const depTask = tasksMap.get(depId);
      if (depTask) {
        depTask.dependents = depTask.dependents || new Set();
        // 被依赖任务的 dependents 加上当前任务id
        depTask.dependents.add(id);
      }
    });

    tasksMap.set(id, task);
    updateTaskStatus({
      id,
      status: paused ? 'paused' : 'queued',
      retryCount: 0,
      result: payload,
    });

    // 非暂停状态时入队执行
    if (!paused) enqueueWaiting(task);
    trySchedule();

    // 返回 Promise 让调用者可 await
    return new Promise<R>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
  }

  // 外部接口：取消任务
  function cancelTask(id: string) {
    const task = tasksMap.get(id);
    if (!task) return;
    const status = taskStatusMap.get(id)?.status;
    if (!status || ['cancelled', 'error', 'success'].includes(status)) return;
    // 更新状态
    updateTaskStatus({
      id: task.id,
      status: 'cancelled',
      retryCount: task.retryCount,
    });
    // 拒绝任务 promise
    task.reject(new Error('Cancelled'));
    // 检查任务是否在等待队列中
    const idx = waitingQueue.findIndex((t) => t.id === id);
    // 从等待队列中移除
    if (idx !== -1) waitingQueue.splice(idx, 1);
    // 如果任务正在运行，触发取消事件
    if (['running'].includes(status)) cancelSubject.next(id);
    // 检查依赖
    checkDependents(task);
    trySchedule();
  }

  // 外部接口：暂停任务
  function pauseTask(id: string) {
    const task = tasksMap.get(id);
    if (!task) return;
    const status = taskStatusMap.get(id)?.status;
    if (!status || !['queued', 'running', 'waiting'].includes(status)) return;
    task.paused = true;
    updateTaskStatus({
      id: task.id,
      status: 'paused',
      retryCount: task.retryCount,
    });
    if (['running'].includes(status)) pauseSubject.next(id);
    // 重新入队
    enqueueWaiting(task);
    trySchedule();
  }

  // 外部接口：恢复任务
  function resumeTask(id: string) {
    const task = tasksMap.get(id);
    if (!task) {
      console.warn(`任务 ${id} 不存在`);
      return;
    }
    const status = taskStatusMap.get(id)?.status;
    if (!status || !['cancelled', 'error', 'paused'].includes(status)) {
      console.warn(`任务 ${id} 状态 ${status} 不允许恢复`);
      return;
    }
    // 重置任务状态
    task.paused = false;
    // 如果是取消或错误状态，保存原始数据
    if (['cancelled', 'error'].includes(status)) {
      task.retryCount = 0;
    }
    // 检查依赖关系
    const isAreDepMet = areDependenciesMet(task);
    // 更新任务状态,排队中或等待
    updateTaskStatus({
      id: task.id,
      status: isAreDepMet ? 'queued' : 'waiting',
      retryCount: task.retryCount,
    });
    console.warn(
      `任务 ${id} 状态从 ${status} 转换为 ${isAreDepMet ? 'queued' : 'waiting'}`,
    );
    if (!isAreDepMet) return;
    // 重新入队
    enqueueWaiting(task);
    trySchedule();
  }

  // 获取当前所有任务状态数组快照
  function getTaskStatus() {
    return [...taskStatusMap.values()];
  }

  // 终止所有 Worker 和清理所有任务数据
  function terminateAll() {
    // 终止所有 Worker
    workerPool.terminateAll();
    // 取消所有运行中的任务
    runningTasks.forEach((taskId) => {
      const task = tasksMap.get(taskId);
      if (!task) return;
      task.controller.abort();
      task.reject(new Error('Terminated'));
      updateTaskStatus({
        id: taskId,
        status: 'cancelled',
        retryCount: task.retryCount,
      });
    });
    // 取消所有等待中的任务
    waitingQueue.forEach((task) => {
      task.controller.abort();
      task.reject(new Error('Terminated'));
      updateTaskStatus({
        id: task.id,
        status: 'cancelled',
        retryCount: task.retryCount,
      });
    });
    // 清理所有数据
    taskStatusMap.clear();
    tasksMap.clear();
    waitingQueue.length = 0;
    runningTasks.clear();
    // 通知所有订阅者
    taskSubject.next({
      id: 'all',
      status: 'cancelled',
      retryCount: 0,
    });
  }

  // 返回对外 API
  return {
    enqueue: addTask,
    cancel: cancelTask,
    pause: pauseTask,
    resume: resumeTask,
    taskSubject,
    taskStatus: getTaskStatus,
    cleanup: terminateAll,
  };
}
