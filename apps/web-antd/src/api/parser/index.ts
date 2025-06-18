import { requestClient } from '#/api/request';

/**
 * 更新解析方法
 * @params knowledge_base_id
 * @params doc_id
 */
export async function updateParser(
  knowledge_base_id: string,
  doc_id: string,
  data: any = {},
) {
  return requestClient.put(
    `/console/api/v2/kb/${knowledge_base_id}/document/${doc_id}/parser`,
    data,
  );
}

/**
 * 开始解析
 * @params knowledge_base_id
 */
export async function startParser(knowledge_base_id: string, data: any = {}) {
  return requestClient.post(
    `/console/api/v2/kb/${knowledge_base_id}/parser_start`,
    data,
  );
}

/**
 * 取消解析
 * @params knowledge_base_id
 */
export async function cancelParser(knowledge_base_id: string, data: any = {}) {
  return requestClient.post(
    `/console/api/v2/kb/${knowledge_base_id}/parser_cancel`,
    data,
  );
}

// /**
//  * 图片录入
//  */
// export async function promptMarkets(params: any = {}) {
//   return requestClient.get(`/api/prompt-markets`, {
//     params,
//   });
// }

// /**
//  * url录入
//  */
// export async function promptMarkets(params: any = {}) {
//   return requestClient.get(`/api/prompt-markets`, {
//     params,
//   });
// }
