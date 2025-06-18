import { requestClient } from '#/api/request';

/**
 * 获取个人知识库文件列表
 * @params id 知识库id
 * @params params 查询参数
 */
export async function getNoteList(id: string, params: any = {}) {
  return requestClient.get(`/console/api/v2/kb/${id}/documents`, { params });
}

/**
 * 创建个人知识库文件
 * @params id 知识库id
 * @params data 文件数据
 */
export async function createNote(id: string, data: any = {}) {
  return requestClient.post(`/console/api/v2/kb/personal/${id}/document`, data);
}

/**
 * 编辑个人知识库文件
 * @params id 文件id
 * @params data 文件数据
 */
export async function editNote(id: string, data: any = {}) {
  return requestClient.put(`/console/api/v2/kb/personal/${id}/document`, data);
}

/**
 * 删除个人知识库文件
 * @params id 知识库id
 * @params data {doc_ids:[]}
 */
export async function deleteNote(id: string, data: any = {}) {
  return requestClient.delete(`/console/api/v2/kb/${id}/documents`, { data });
}
