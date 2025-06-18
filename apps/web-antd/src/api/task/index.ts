/* eslint-disable unicorn/no-object-as-default-parameter */
import { requestClient } from '#/api/request';

/**
 * 创建定时任务
 * @param data
 */
export async function createCronTask(data: any = {}) {
  return requestClient.post(`/console/api/cron/create`, data);
}

/**
 * 获取定时任务列表
 * @param params
 */
export async function getCronTaskList(params: any = {}) {
  return requestClient.get(`/console/api/cron/get`, { params });
}

/**
 * 获取任定时务类型列表
 * @param params 任务类型 1: 2: 3: 4: 5: 6:
 */
export async function getCronTaskTypeList(params: any = { task_type: 2 }) {
  return requestClient.get(`/console/api/cron/tasks`, { params });
}

/**
 * 获取自动化功能列表
 * @param params
 */
export async function getAutomationList(params: any = {}) {
  return requestClient.get(`/console/api/rpas`, { params });
}

/**
 * 创建运行任务
 * @param id
 * @param data
 */
export async function createTask(id: string, data: any = {}) {
  return requestClient.post(`/console/api/rpa/${id}/task`, data);
}

/**
 * 获取任务详情
 * @param id
 * @param params
 */
export async function getTaskDetail(id: string, params: any = {}) {
  return requestClient.get(`/console/api/rpa/${id}`, { params });
}

/**
 * 获取运行任务记录
 * @param id
 * @param params
 */
export async function getTaskRecord(id: string, params: any = {}) {
  return requestClient.get(`/console/api/rpa/${id}/tasks`, { params });
}

/**
 * 获取所有运行任务记录
 * @param params rpa_id status
 */
export async function getTaskRecordList(params: any = {}) {
  return requestClient.get(`/console/api/rpas/tasks`, { params });
}
