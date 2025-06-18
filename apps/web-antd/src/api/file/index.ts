import { requestClient } from '#/api/request';

/**
 * 上传文件
 * @data file
 */
export async function uploadFile(data: any = {}) {
  return requestClient.post(`/console/api/common/files/upload`, data);
}

/**
 * 上传文件解析
 * @data file
 */
export async function docParser(data: any = {}) {
  return requestClient.post(`/console/api/files/doc_parser`, data);
}

/**
 * 查询解析文件进度
 * @params id
 */
export async function docParseDetail(params: any = {}) {
  return requestClient.get(`/console/api/files/doc_parse`, {
    params,
  });
}

/**
 * 查看知识库文件
 * @params id
 */
export async function getKbFile(id: string, params: any = {}) {
  return requestClient.get(`/console/api/v2/kb/${id}/documents`, {
    params,
  });
}

/**
 * 文件上传到知识库
 * @params id
 */
export async function uploadKbFile(id: string, data: any = {}) {
  return requestClient.post(`/console/api/v2/kb/${id}/documents`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 更改文件状态
 * @params id
 */
export async function changeKbFileStatus(id: string, params: any = {}) {
  return requestClient.get(`/console/api/v2/kb/${id}/documents`, {
    params,
  });
}

/**
 * 删除文件
 * @params id
 */
export async function deleteKbFile(id: string, data: any = {}) {
  return requestClient.delete(`/console/api/v2/kb/${id}/documents`, data);
}

/**
 * 修改知识库文件名
 * @params knowledge_base_id
 * @params doc_id
 */
export async function editKbFile(
  knowledge_base_id: string,
  doc_id: string,
  data: any = {},
) {
  return requestClient.put(
    `/console/api/v2/kb/${knowledge_base_id}/document/${doc_id}`,
    data,
  );
}
