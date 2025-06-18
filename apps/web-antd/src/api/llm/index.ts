/* eslint-disable unicorn/no-object-as-default-parameter */
import { requestClient } from '#/api/request';

/**
 * 获取模型列表
 */
export async function llmmodel(params: any = {}) {
  return requestClient.get(
    `/console/api/workspaces/current/models/model-types/llm`,
    {
      params,
    },
  );
}

export async function getModelList(params: any = { model_type: 'llm' }) {
  return requestClient.get(`/console/api/ai-model-providers/available-models`, {
    params,
  });
}

export async function promptMarkets(params: any = {}) {
  return requestClient.get(`/console/api/prompt-markets`, {
    params,
  });
}
