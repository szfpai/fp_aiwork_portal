import { requestClient } from '#/api/request';

/**
 * 查看知识库列表
 * @params dpt_id=&name=&one_depth=false&pid=
 */
export async function getSubjectList(params: any = {}) {
  return requestClient.get(`/console/api/v2/kbs`, { params });
}

/**
 * 创建知识库
 * @params id
 */
export async function createSubject(_: string, data: any = {}) {
  return requestClient.post(`/console/api/v2/kbs`, data);
}

/**
 * 查看知识库详情
 * @params id
 */
export async function getSubjectDetail(id: string, params: any = {}) {
  return requestClient.get(`/console/api/v2/kb/${id}`, { params });
}

/**
 * 更新知识库信息
 * @params id
 */
export async function updateSubject(id: string, data: any = {}) {
  return requestClient.put(`/console/api/v2/kb/${id}`, data);
}

/**
 * 删除知识库
 * @params id
 */
export async function deleteSubject(id: string, data: any = {}) {
  return requestClient.delete(`/console/api/v2/kb/${id}`, { data });
}

/**
 * 查看非结构化知识库自动构建的数据库
 * @params id
 */
export async function getSubjectDb(id: string, params: any = {}) {
  return requestClient.get(`/console/api/v2/kb/${id}/db`, { params });
}
