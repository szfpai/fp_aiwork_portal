/* eslint-disable unicorn/no-object-as-default-parameter */
import { requestClient } from '#/api/request';

/**
 * 创建会话
 * @data { count: 4, window_mode: 0 }
 */
export async function createChat(data: any = { count: 4, window_mode: 0 }) {
  return requestClient.post('/console/api/chat_group/create', data);
}

/**
 * 获取会话名称
 * @id
 * @data { auto_generate: true, name: '' }
 */
export async function chatName(
  id: string,
  data: any = { auto_generate: true, name: '' },
) {
  return requestClient.post(`/console/api/chat_group/${id}/name`, data);
}

/**
 * 获取分组列表
 * @params
 */
export async function chatGroup(params: any = {}) {
  return requestClient.get('/console/api/chat_group/list', { params });
}

/**
 * 分组配置
 * @id
 * @params {limit:30,page:1}
 */
export async function chatGroupConfig(id: string, params: any = {}) {
  return requestClient.get(`/console/api/chat_group/${id}/config`, {
    params,
  });
}

/**
 * 分组创建
 * @data {count:4,window_mode:0}
 */
export async function createChatGroup(
  data: any = { count: 4, window_mode: 0 },
) {
  return requestClient.post(`/console/api/chat_group/create`, data);
}

/**
 * 修改分组配置
 * @id
 * @data {}
 */
export async function editGroupConfig(id: string, data: any = {}) {
  return requestClient.put(`/console/api/chat_group/${id}/config`, data);
}

/**
 * 会话历史消息
 * @id
 * @params {limit:30,page:1}
 */
export async function chatGroupMessages(id: string, params: any = {}) {
  return requestClient.get(`/console/api/chat_group/${id}/messages`, {
    params,
  });
}

/**
 * 删除会话组
 * @id
 * @data {}
 */
export async function deleteChatGroup(id: string, data: any = {}) {
  return requestClient.delete(`/console/api/chat_group/${id}`, data);
}

/**
 * 删除会话
 * @id
 * @data {}
 */
export async function deleteConverMessages(id: string, data: any = {}) {
  return requestClient.delete(
    `/console/api/conversations/${id}/messages`,
    data,
  );
}

/**
 * 会话重新命名
 * @id
 * @data {auto_generate:fasle,name:""}
 */
export async function renameConversation(id: string, data: any = {}) {
  return requestClient.post(`/console/api/chat_group/${id}/name`, data);
}

/**
 * 可用模型
 * @params {model_type:"llm"}
 */
export async function availableMdels(params: any = {}) {
  return requestClient.get(
    `/console/api/ai-model-providers/available-models?model_type=llm`,
    { params },
  );
}

/**
 * 发送消息
 * conversation_id:""
files: []
inputs: {}
query: "111111"
response_mode: "streaming"
 */
export async function chatCompletions(id: string, data: any = {}) {
  return requestClient.post(`/console/api/chat/${id}/completions`, data);
}

export async function chatStop(chatId: string, taskId: string, data: any = {}) {
  return requestClient.post(
    `/console/api/chat/${chatId}/conversations/${taskId}/stop`,
    data,
  );
}
