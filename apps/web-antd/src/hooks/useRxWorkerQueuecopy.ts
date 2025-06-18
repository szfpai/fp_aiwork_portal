import { from, Observable, of, Subject, throwError } from 'rxjs';
import {
  catchError,
  filter,
  finalize,
  map,
  switchMap,
  tap,
  timeout,
} from 'rxjs/operators';
import { spawn, Thread, Worker } from 'threads';
import { v4 as uuidv4 } from 'uuid';

import loadWorkerURL from '#/utils/worker-loader';

/**
 * 任务状态类型定义
 * @property cancelled - 任务被取消
 * @property error - 任务执行失败
 * @property paused - 任务暂停
 * @property queued - 任务在队列中等待
 * @property running - 任务正在执行
 * @property success - 任务执行成功
 * @property waiting - 任务等待依赖完成
 */
export type TaskStatusType =
  | 'cancelled'
  | 'error'
  | 'paused'
  | 'queued'
  | 'running'
  | 'success'
  | 'waiting';

/**
 * 任务接口定义
 * @template T - 任务输入数据类型
 */
export interface Task<T = any> {
  id: string; // 任务唯一标识符
  payload: T; // 任务输入数据
  paused: boolean; // 任务是否暂停
  retryCount: number; // 当前重试次数
  maxRetries: number; // 最大重试次数
  timeout?: number; // 任务超时时间（毫秒）
  controller: AbortController; // 用于取消任务的控制器
  priority: number; // 任务优先级（数字越大优先级越高）
  dependencies?: string[]; // 依赖的任务ID列表
  dependents?: Set<string>; // 依赖当前任务的任务ID集合
  createdAt: number; // 任务创建时间戳
  updatedAt: number; // 任务最后更新时间戳
  messageHandler?: (e: MessageEvent) => void;
}

/**
 * 任务状态接口定义
 */
export interface TaskStatus {
  id: string; // 任务ID
  status: TaskStatusType; // 任务状态
  retryCount: number; // 当前重试次数
  result?: any; // 任务执行结果
  error?: any; // 任务执行错误
  progress?: number; // 任务执行进度
  updatedAt: number; // 状态更新时间戳
  createdAt?: number; // 状态更新时间戳
}

// 移除之前的类型声明，改用类型导入
type ThreadType = {
  abort<T>(): Promise<T>;
  run<T>(data: any): Promise<T>;
  terminate(): Promise<void>;
};

/* type WorkerType = {
  new (url: URL, options?: { type: string }): Worker;
}; */

// 使用类型断言
const typedSpawn = spawn as (worker: Worker) => Promise<ThreadType>;
// const TypedWorker = Worker as unknown as WorkerType;

// 定义消息处理器类型
type MessageHandler = (e: MessageEvent) => void;

// 定义任务选项接口
interface TaskOptions {
  dependencies?: string[];
  id?: string;
  maxRetries?: number;
  messageHandler?: MessageHandler;
  paused?: boolean;
  priority?: number;
  timeout?: number;
}

// 定义任务结果接口
interface TaskResult<T = any> {
  type: 'error' | 'success';
  result?: T;
  error?: any;
  executionTime: number;
}

// 线程池管理类
/**
 * 线程池管理类
 * 负责管理Web Worker线程的创建、分配和释放
 */
class ThreadPool {
  private busyThreads: Set<string> = new Set(); // 当前忙碌的线程ID集合
  private listenerMap: Map<string, Worker> = new Map();
  private maxSize: number; // 线程池最大大小
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private pool: Map<string, ThreadType> = new Map(); // 线程池，存储线程ID到线程实例的映射
  private threadTaskMap: Map<string, string> = new Map(); // 线程ID到任务ID的映射
  private workerName: string; // Worker脚本文件名

  /**
   * 构造函数
   * @param workerName - Worker脚本的文件名
   * @param maxSize - 线程池最大大小
   */
  constructor(workerName: string, maxSize: number) {
    this.workerName = workerName;
    // 获取设备的硬件并发数，如果不可用则默认为4
    const hardwareConcurrency = navigator.hardwareConcurrency ?? 4;
    // 确保线程池大小在合理范围内：最小1，最大不超过硬件并发数
    this.maxSize = Math.max(
      1,
      Math.min(maxSize ?? hardwareConcurrency, hardwareConcurrency),
    );
  }

  /**
   * 获取一个可用的线程
   * @returns 包含线程实例和线程ID的对象
   * @throws 当没有可用线程时抛出错误
   */
  async acquire(
    handler?: MessageHandler,
  ): Promise<{ thread: ThreadType; threadId: string }> {
    try {
      // 查找空闲线程
      const availableThread = [...this.pool.entries()].find(
        ([id]) => !this.busyThreads.has(id),
      );
      if (availableThread) {
        this.busyThreads.add(availableThread[0]);
        return { thread: availableThread[1], threadId: availableThread[0] };
      }
      // 如果线程池未满，创建新线程
      if (this.pool.size > this.maxSize) {
        throw new Error('No available threads in the pool');
      }
      const url = await loadWorkerURL(this.workerName);
      const id = uuidv4().replaceAll('-', '');
      const rawWorker = new Worker(url, {
        type: 'module',
        name: `worker-${id}`,
      });
      // 如果提供了消息处理器，则添加监听器
      if (handler && typeof handler === 'function') {
        // 监听进度消息
        rawWorker.addEventListener('message', handler);
        // 保存 worker 实例和消息处理器
        this.listenerMap.set(id, rawWorker);
        this.messageHandlers.set(id, handler);
      }
      const thread = await typedSpawn(rawWorker);
      this.pool.set(id, thread);
      this.busyThreads.add(id);
      return { thread, threadId: id };
    } catch (error: any) {
      throw new Error(error?.message ?? error);
    }
  }

  /**
   * 根据任务ID查找对应的线程ID
   * @param taskId - 任务ID
   * @returns 对应的线程ID，如果未找到则返回undefined
   */
  findThreadIdByTaskId(taskId: string): string | undefined {
    for (const [threadId, mappedTaskId] of this.threadTaskMap.entries()) {
      if (mappedTaskId === taskId) {
        return threadId;
      }
    }
    return undefined;
  }

  /**
   * 获取当前忙碌的线程数量
   */
  getBusyThreadsCount(): number {
    return this.busyThreads.size;
  }

  /**
   * 获取线程池当前大小
   */
  getPoolSize(): number {
    return this.pool.size;
  }

  /**
   * 释放线程
   * @param threadId - 要释放的线程ID
   */
  release(threadId: string) {
    this.busyThreads.delete(threadId);
    this.threadTaskMap.delete(threadId);
    // 移除消息监听器
    const listener = this.listenerMap.get(threadId);
    const handler = this.messageHandlers.get(threadId);
    if (listener && handler) {
      listener.removeEventListener('message', handler);
      this.listenerMap.delete(threadId);
      this.messageHandlers.delete(threadId);
    }
  }

  /**
   * 设置线程ID到任务ID的映射
   * @param threadId - 线程ID
   * @param taskId - 任务ID
   */
  setThreadTask(threadId: string, taskId: string) {
    this.threadTaskMap.set(threadId, taskId);
  }

  /**
   * 终止指定线程
   * @param threadId - 要终止的线程ID
   */
  async terminate(threadId: string) {
    const thread = this.pool.get(threadId);
    if (!thread) return;
    if (typeof thread?.abort === 'function') thread.abort();
    try {
      this.release(threadId);
      await Thread.terminate(thread);
      this.pool.delete(threadId);
    } catch (error) {
      // 忽略终止失败
      console.warn('🚀 ~ cleanIdleWorkers ~ error:', error);
    }
  }

  /**
   * 终止所有线程
   */
  async terminateAll() {
    try {
      await Promise.all([...this.pool.keys()].map((id) => this.terminate(id)));
    } catch (error) {
      console.warn('Error terminating all threads:', error);
    } finally {
      this.pool.clear();
      this.busyThreads.clear();
      this.threadTaskMap.clear();
      this.listenerMap.clear();
      this.messageHandlers.clear();
    }
  }
}

/**
 * 性能监控接口定义
 */
interface QueueMetrics {
  totalTasks: number; // 总任务数
  runningTasks: number; // 运行中的任务数
  waitingTasks: number; // 等待中的任务数
  completedTasks: number; // 已完成的任务数
  failedTasks: number; // 失败的任务数
  cancelledTasks: number; // 取消的任务数
  averageTaskTime: number; // 平均任务执行时间
  threadPoolSize: number; // 线程池大小
  busyThreads: number; // 忙碌的线程数
  memoryUsage: {
    // 内存使用情况
    tasksMap: number; // 任务映射内存使用
    taskStatusMap: number; // 任务状态映射内存使用
    waitingQueue: number; // 等待队列内存使用
  };
}

/**
 * 主队列管理函数
 * @param workerName - Worker脚本的URL
 * @param maxConcurrency - 最大并发任务数
 * @param maxThreadPoolSize - 线程池最大大小
 */
export function useRxWorkerQueue(
  workerName: string,
  maxConcurrency: number = 2,
  maxThreadPoolSize: number = 2,
  MAX_QUEUE_SIZE: number = 1000,
) {
  // 状态管理
  const taskStatusMap = new Map<string, TaskStatus>(); // 任务状态映射
  const tasksMap = new Map<string, Task>(); // 任务映射
  const runningTasks = new Set<string>(); // 运行中的任务集合
  const waitingQueue: Task[] = []; // 等待队列

  // RxJS Subjects
  const taskSubject = new Subject<TaskStatus>(); // 任务状态更新Subject
  const progressSubject = new Subject<{ id: string; progress: number }>(); // 任务进度Subject

  // 创建线程池
  const threadPool = new ThreadPool(workerName, maxThreadPoolSize);

  // 添加一个变量来存储 requestAnimationFrame 的 ID
  let scheduleTasksAnimationFrameId: null | number = null;

  /**
   * 更新任务状态
   * @param status - 新的任务状态
   */
  function updateTaskStatus(status: TaskStatus) {
    /* const currentStatus = taskStatusMap.get(status.id)?.status;
    if (currentStatus && !isValidStatus(currentStatus, status.status)) return; */
    status.updatedAt = Date.now();
    taskStatusMap.set(status.id, status);
    taskSubject.next(status);
  }

  // 状态转换验证函数
  function isValidStatus(from: TaskStatusType, to: TaskStatusType): boolean {
    const validTransitions: Record<TaskStatusType, TaskStatusType[]> = {
      queued: ['running', 'paused', 'cancelled'],
      running: ['success', 'error', 'cancelled'],
      paused: ['queued', 'cancelled'],
      waiting: ['queued', 'cancelled'],
      success: [],
      error: ['queued'],
      cancelled: [],
    };
    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * 检查任务依赖是否满足
   * @param task - 要检查的任务
   * @returns 如果所有依赖都满足返回true，否则返回false
   */
  function areDependenciesMet(task: Task): boolean {
    if (!task.dependencies?.length) return true;
    // 检查是否有循环依赖
    if (hasCircularDependency(task)) return false;
    return task.dependencies.every((depId) => {
      const status = taskStatusMap.get(depId);
      if (!status) return false;
      // 若依赖不存在或状态为失败/取消等，不允许运行
      return status?.status === 'success';
    });
  }

  // 循环依赖检测
  function hasCircularDependency(
    task: Task,
    visited = new Set<string>(),
  ): boolean {
    if (visited.has(task.id)) return true;
    visited.add(task.id);
    return (
      task.dependencies?.some((depId) => {
        const depTask = tasksMap.get(depId);
        return depTask
          ? hasCircularDependency(depTask, new Set(visited))
          : false;
      }) ?? false
    );
  }

  /**
   * 处理任务错误
   * @param task - 发生错误的任务
   * @param error - 错误信息
   */
  function handleTaskError(task: Task, error: any) {
    const isRetry = task.retryCount < task.maxRetries;
    updateTaskStatus({
      id: task.id,
      status: isRetry ? 'queued' : 'error',
      retryCount: task.retryCount,
      error: error?.message ?? error ?? 'Unknown error',
      updatedAt: Date.now(),
    });
    if (isRetry) {
      task.retryCount++;
      enqueueWaiting(task);
      return;
    }
    checkDependents(task);
  }

  /**
   * 执行任务
   * @param task - 要执行的任务
   * @returns 任务执行的Observable
   */
  function executeTask(task: Task): Observable<any> {
    // 并发控制
    if (runningTasks.size >= maxConcurrency) {
      return throwError(() => new Error('Maximum concurrency reached'));
    }

    // 任务执行前的检查
    if (!task.payload) {
      return throwError(() => new Error('Task payload is required'));
    }
    const startTime = Date.now();
    runningTasks.add(task.id);
    return from(threadPool.acquire(task?.messageHandler)).pipe(
      switchMap(({ thread, threadId }) => {
        if (!thread || !threadId) {
          runningTasks.delete(task.id);
          return throwError(() => new Error('Thread acquisition failed'));
        }
        updateTaskStatus({
          id: task.id,
          status: 'running',
          retryCount: task.retryCount,
          updatedAt: startTime,
        });
        threadPool.setThreadTask(threadId, task.id);
        const task$ = from(thread.run(structuredClone(task.payload))).pipe(
          task.timeout ? timeout(task.timeout) : map((x) => x),
          map((result: any) => {
            if (typeof thread?.abort === 'function') thread.abort();
            return {
              type: 'success',
              result,
              executionTime: Date.now() - startTime,
            };
          }),
          tap({
            next: ({ result = {} }) => {
              // 成功时执行的逻辑
              updateTaskStatus({
                id: task.id,
                status: 'success',
                retryCount: task.retryCount,
                result,
                updatedAt: Date.now(),
              });
              checkDependents(task);
            },
          }),
          catchError((error) => {
            handleTaskError(task, error);
            return of({
              type: 'error',
              error,
              executionTime: Date.now() - startTime,
            });
          }),
          finalize(() => {
            threadPool.terminate(threadId);
          }),
        );
        return task$;
      }),
      catchError((error) => {
        // 处理线程获取失败,重新排队等待
        updateTaskStatus({
          id: task.id,
          status: 'queued',
          retryCount: task.retryCount,
          updatedAt: Date.now(),
        });
        enqueueWaiting(task);
        return of({
          type: 'error',
          error,
          executionTime: Date.now() - startTime,
        });
      }),
    );
  }

  /**
   * 优化任务调度
   * 根据优先级、依赖关系和资源可用性调度任务
   */
  function scheduleTasks() {
    // 如果已经有调度在进行，先取消它
    cleanAnimationFrame();
    scheduleTasksAnimationFrameId = requestAnimationFrame((frameStartTime) => {
      // 每帧有 16ms 的时间预算（60fps）
      const FRAME_BUDGET = 16.667;

      while (runningTasks.size < maxConcurrency && waitingQueue.length > 0) {
        // 检查当前帧剩余时间
        const elapsedTime = performance.now() - frameStartTime;
        // 如果剩余时间不足，将剩余任务放到下一帧
        if (elapsedTime >= FRAME_BUDGET) {
          scheduleTasks();
          return;
        }
        const task = waitingQueue.shift();
        if (!task) break;
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
            updatedAt: Date.now(),
          });
          continue;
        }
        // 执行任务
        const subscription = executeTask(task).subscribe({
          complete: () => {
            // 更新性能指标
            updateQueueMetrics();
            // 清理资源
            subscription.unsubscribe();
            runningTasks.delete(task.id);
            // 在释放线程后立即调度新任务
            if (waitingQueue.length > 0) {
              scheduleTasks();
            } else {
              // 只有当队列为空时，才清除 ID
              cleanAnimationFrame();
            }
          },
        });
      }
    });
  }

  /**
   * 检查当前任务的所有依赖任务是否满足，满足则重新入队执行
   * @param task - 已完成的任务
   */
  function checkDependents(task: Task) {
    task.dependents?.forEach((depId) => {
      const dependentTask = tasksMap.get(depId);
      if (!dependentTask) return;
      if (areDependenciesMet(dependentTask) && !dependentTask.paused) {
        // 从当前任务的 dependents 中移除已满足依赖的任务
        task.dependents?.delete(depId);
        updateTaskStatus({
          id: depId,
          status: 'queued',
          retryCount: dependentTask.retryCount,
          updatedAt: Date.now(),
        });
        enqueueWaiting(dependentTask);
        scheduleTasks();
      }
    });
  }

  /**
   * 按优先级插入等待队列（优先级越高越靠前）
   * @param task - 要添加的任务
   */
  function enqueueWaiting(task: Task) {
    if (waitingQueue.length >= MAX_QUEUE_SIZE) {
      console.warn('Waiting queue is full');
      return;
    }
    // 验证优先级范围
    if (task.priority < 0 || task.priority > 100) {
      console.warn(`Invalid priority value: ${task.priority}`);
      task.priority = Math.max(0, Math.min(100, task.priority));
    }

    removeTaskFromQueue(waitingQueue, task.id);
    if (task.paused) return;
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

  /**
   * 添加新任务
   * @param payload - 任务输入数据
   * @param options - 任务配置选项
   * @returns 任务执行的Observable
   */
  function addTask<T = any>(
    payload: T,
    options?: Partial<TaskOptions>,
  ): Observable<T> {
    const id = options?.id ?? uuidv4().replaceAll('-', '');
    const task: Task<T> = {
      id,
      payload,
      messageHandler: options?.messageHandler,
      paused: options?.paused ?? false,
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 0,
      timeout: options?.timeout,
      controller: new AbortController(),
      priority: options?.priority ?? 0,
      dependencies: options?.dependencies ?? [],
      dependents: new Set(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // 检查循环依赖
    if (checkCircularDependency(task.id)) {
      console.warn(`警告：任务 ${task.id} 存在循环依赖`);
    }
    // 维护依赖关系时，应该是让被依赖任务的 dependents 集合中添加当前任务 ID
    task.dependencies?.forEach((depId) => {
      const depTask = tasksMap.get(depId);
      if (!depTask) return;
      depTask.dependents = depTask.dependents || new Set();
      // 被依赖任务的 dependents 加上当前任务id
      depTask.dependents.add(id);
    });
    tasksMap.set(id, task);
    updateTaskStatus({
      id,
      status: task.paused ? 'paused' : 'queued',
      retryCount: 0,
      result: payload,
      updatedAt: Date.now(),
      createdAt: task.createdAt,
    });

    if (!task.paused) enqueueWaiting(task);
    scheduleTasks();
    return taskSubject.pipe(
      filter((status) => status.id === id),
      map((status) => {
        if (status.status === 'success') return status.result;
        if (status.status === 'error') throw status.error;
        return null;
      }),
    );
  }

  /**
   * 取消任务
   * @param id - 要取消的任务ID
   */
  function cancelTask(id: string) {
    const task = tasksMap.get(id);
    if (!task) return;
    // 取消完整性检查
    const dependentTasks = task.dependents;
    if (dependentTasks?.size) {
      // 递归取消依赖任务
      dependentTasks.forEach((depId) => {
        const depTask = tasksMap.get(depId);
        if (depTask) cancelTask(depId);
      });
    }
    const status = taskStatusMap.get(id)?.status;
    if (!status || ['cancelled', 'error', 'success'].includes(status)) return;
    cleanAnimationFrame();
    updateTaskStatus({
      id,
      status: 'cancelled',
      retryCount: task.retryCount,
      updatedAt: Date.now(),
    });
    // 检查任务是否在等待队列中
    const idx = waitingQueue.findIndex((t) => t.id === id);
    // 从等待队列中移除
    if (idx !== -1) waitingQueue.splice(idx, 1);
    // 如果任务正在运行，触发取消事件
    if (['running'].includes(status)) {
      const thread = threadPool.findThreadIdByTaskId(id);
      task.controller.abort();
      runningTasks.delete(task.id);
      if (thread) threadPool.terminate(thread);
    }
    // 检查依赖
    checkDependents(task);
    scheduleTasks();
  }

  /**
   * 暂停任务
   * @param id - 要暂停的任务ID
   */
  function pauseTask(id: string) {
    const task = tasksMap.get(id);
    if (!task) return;
    const status = taskStatusMap.get(id)?.status;
    if (!status || !['queued', 'running', 'waiting'].includes(status)) return;
    cleanAnimationFrame();
    task.paused = true;
    updateTaskStatus({
      id,
      status: 'paused',
      retryCount: task.retryCount,
      updatedAt: Date.now(),
    });
    if (['running'].includes(status)) {
      const thread = threadPool.findThreadIdByTaskId(id);
      task.controller.abort();
      runningTasks.delete(task.id);
      if (thread) threadPool.terminate(thread);
    }
    // 重新入队
    enqueueWaiting(task);
    scheduleTasks();
  }

  /**
   * 恢复任务
   * @param id - 要恢复的任务ID
   */
  function resumeTask(id: string) {
    const task = tasksMap.get(id);
    if (!task) return;
    const status = taskStatusMap.get(id)?.status;
    if (!status || !['cancelled', 'error', 'paused'].includes(status)) return;
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
      updatedAt: Date.now(),
    });
    if (!isAreDepMet) return;
    // 重新入队
    enqueueWaiting(task);
    scheduleTasks();
  }

  /**
   * 获取任务状态
   * @param id - 任务ID，如果不提供则返回所有任务状态
   * @returns 任务状态或状态数组
   */
  function getTaskStatus(id?: string) {
    if (id) {
      return taskStatusMap.get(id);
    }
    return [...taskStatusMap.values()];
  }

  /**
   * 获取队列统计信息
   * @returns 队列统计信息对象
   */
  function getQueueStats() {
    return {
      totalTasks: tasksMap.size,
      runningTasks: runningTasks.size,
      waitingTasks: waitingQueue.length,
      completedTasks: [...taskStatusMap.values()].filter((status) =>
        ['cancelled', 'error', 'success'].includes(status.status),
      ).length,
      threadPoolSize: threadPool.getPoolSize(),
      busyThreads: threadPool.getBusyThreadsCount(),
    };
  }

  /**
   * 获取队列性能指标
   * @returns 队列性能指标对象
   */
  function getQueueMetrics(): QueueMetrics {
    const completedTasks = [...taskStatusMap.values()].filter(
      (status) => status.status === 'success',
    );
    const failedTasks = [...taskStatusMap.values()].filter(
      (status) => status.status === 'error',
    );
    const cancelledTasks = [...taskStatusMap.values()].filter(
      (status) => status.status === 'cancelled',
    );

    // 计算平均任务时间
    const taskTimes = completedTasks.map((status) => {
      const task = tasksMap.get(status.id);
      return task ? status.updatedAt - task.createdAt : 0;
    });
    const averageTaskTime =
      taskTimes.length > 0
        ? taskTimes.reduce((a, b) => a + b, 0) / taskTimes.length
        : 0;

    // 估算内存使用
    const estimateMapSize = (map: Map<any, any>) => {
      let size = 0;
      map.forEach((value, key) => {
        size += JSON.stringify(value).length + key.length;
      });
      return size;
    };

    return {
      totalTasks: tasksMap.size,
      runningTasks: runningTasks.size,
      waitingTasks: waitingQueue.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      cancelledTasks: cancelledTasks.length,
      averageTaskTime,
      threadPoolSize: threadPool.getPoolSize(),
      busyThreads: threadPool.getBusyThreadsCount(),
      memoryUsage: {
        tasksMap: estimateMapSize(tasksMap),
        taskStatusMap: estimateMapSize(taskStatusMap),
        waitingQueue: JSON.stringify(waitingQueue).length,
      },
    };
  }

  /**
   * 循环依赖检查
   * @param taskId - 要检查的任务id
   */
  function checkCircularDependency(taskId: string): boolean {
    const visited = new Set<string>();
    const path: string[] = []; // 记录依赖路径
    const check = (currentId: string): boolean => {
      if (visited.has(currentId)) {
        // 找到循环依赖，记录路径
        const cycleStart = path.indexOf(currentId);
        // eslint-disable-next-line unicorn/prefer-spread
        const cycle = path.slice(cycleStart).concat(currentId);
        console.warn(`发现循环依赖: ${cycle.join(' -> ')}`);
        return true;
      }
      visited.add(currentId);
      path.push(currentId);
      const task = tasksMap.get(currentId);
      if (!task?.dependencies) {
        path.pop();
        return false;
      }
      const hasCycle = task.dependencies.some((depId) => check(depId));
      path.pop();
      return hasCycle;
    };
    return check(taskId);
  }

  function cleanAnimationFrame(): void {
    if (scheduleTasksAnimationFrameId !== null) {
      cancelAnimationFrame(scheduleTasksAnimationFrameId);
      scheduleTasksAnimationFrameId = null;
    }
  }

  /**
   * 清理依赖关系
   * @param task - 要清理的任务
   */
  function cleanupDependencies(task: Task) {
    if (task.dependencies) {
      task.dependencies.forEach((depId) => {
        const depTask = tasksMap.get(depId);
        if (depTask?.dependents) {
          depTask.dependents.delete(task.id);
        }
      });
    }
    if (task.dependents) {
      task.dependents.forEach((depId) => {
        const depTask = tasksMap.get(depId);
        if (depTask?.dependencies) {
          const depIndex = depTask.dependencies.indexOf(task.id);
          if (depIndex !== -1) {
            depTask.dependencies.splice(depIndex, 1);
          }
        }
      });
    }
  }

  /**
   * 清理任务相关资源
   * @param taskId - 要清理的任务ID
   */
  function cleanupTask(taskId: string) {
    const task = tasksMap.get(taskId);
    if (!task) return;
    // 清理队列
    removeTaskFromQueue(waitingQueue, taskId);
    // 清理相关资源
    tasksMap.delete(taskId);
    taskStatusMap.delete(taskId);
    runningTasks.delete(taskId);
    // 清理依赖关系
    cleanupDependencies(task);
  }

  /**
   * 清理所有资源
   */
  async function cleanup() {
    cleanAnimationFrame();
    await threadPool.terminateAll();
    // 清理所有任务
    const taskIds = [...tasksMap.keys()];
    for (const taskId of taskIds) {
      cleanupTask(taskId);
    }
    waitingQueue.length = 0;
    taskSubject.next({
      id: 'all',
      status: 'cancelled',
      retryCount: 0,
      updatedAt: Date.now(),
    });
  }

  /**
   * 更新任务进度
   * @param id - 任务ID
   * @param progress - 进度值（0-100）
   */
  function updateTaskProgress(id: string, progress: number) {
    const status = taskStatusMap.get(id);
    if (status && status.status === 'running') {
      updateTaskStatus({
        ...status,
        progress,
        updatedAt: Date.now(),
      });
      progressSubject.next({ id, progress });
    }
  }

  /**
   * 性能指标收集和预警
   */
  function updateQueueMetrics() {
    const metrics = getQueueMetrics();
    const warnings = [];

    // 并发度检查
    const concurrencyRatio = metrics.runningTasks / maxConcurrency;
    if (concurrencyRatio > 0.8) {
      warnings.push(`High concurrency: ${concurrencyRatio * 100}%`);
    }

    // 内存使用检查
    const memoryThreshold = 1_000_000; // 1MB
    if (metrics.memoryUsage.tasksMap > memoryThreshold) {
      warnings.push(`High memory usage: ${metrics.memoryUsage.tasksMap} bytes`);
    }

    // 任务执行时间检查
    if (metrics.averageTaskTime > 5000) {
      warnings.push(`Long average task time: ${metrics.averageTaskTime}ms`);
    }

    // 队列积压检查
    if (metrics.waitingTasks > 100) {
      warnings.push(`Queue backlog: ${metrics.waitingTasks} tasks`);
    }

    if (warnings.length > 0) {
      console.warn('Queue performance warnings:', warnings);
    }

    // 记录性能指标
    performance.mark('queue-metrics');
    performance.measure('queue-performance', 'queue-metrics');
  }

  /**
   * 重新执行失败或已取消的任务
   * @param id - 要重新执行的任务ID
   * @returns 是否成功重新执行
   */
  function retryFailedTask(id: string): boolean {
    const task = tasksMap.get(id);
    if (!task) return false;

    const status = taskStatusMap.get(id);
    if (!status || !['cancelled', 'error'].includes(status.status))
      return false;

    // 重置任务状态
    task.retryCount = 0;
    task.updatedAt = Date.now();

    // 更新任务状态为等待中
    updateTaskStatus({
      id,
      status: 'queued',
      retryCount: 0,
      updatedAt: Date.now(),
    });

    // 将任务重新加入等待队列
    enqueueWaiting(task);
    scheduleTasks();

    return true;
  }

  return {
    enqueue: addTask,
    cancel: cancelTask,
    pause: pauseTask,
    resume: resumeTask,
    retryFailed: retryFailedTask,
    taskSubject,
    progressSubject,
    getTaskStatus,
    getQueueStats,
    getQueueMetrics,
    updateTaskProgress,
    cleanup,
  };
}
