import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import axios from 'axios';

// 定义请求选项接口
interface FetchOptions {
  body?: any;
  headers?: HeadersInit;
  method?: 'DELETE' | 'GET' | 'POST' | 'PUT';
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * 创建一个带有拦截器的 Axios 实例
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: '/api', // 可按需配置
  timeout: 1000 * 60 * 30,
});

// ✅ 请求拦截器：自动注入 Token
axiosInstance.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => {
    // 处理错误
    if (error.response) {
      // 服务器响应错误
      console.error('Response error:', error.response);
    } else if (error.request) {
      // 请求发送失败
      console.error('Request error:', error.request);
    } else {
      // 其他错误
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  },
);

/**
 * 基于 Axios 配置包装 fetch 请求
 * 兼容请求拦截器与流式响应
 */
export async function fetchWithAxiosInterceptors(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const {
    method = 'GET',
    body,
    headers,
    timeout,
    signal: userSignal,
  } = options;

  const controller = new AbortController();
  const timeoutId = timeout
    ? setTimeout(() => controller.abort(), timeout)
    : null;

  // 如果用户传入自己的 signal，则合并处理
  const signal = userSignal
    ? mergeAbortSignals(controller.signal, userSignal)
    : controller.signal;

  // 创建一个假的 Axios 请求用于应用拦截器逻辑
  const dummyAxiosConfig: AxiosRequestConfig = {
    url,
    method,
    data: body,
    headers,
    // 使用 dummy adapter 避免 Axios 真正发请求
    adapter: async (config: any) => {
      return {
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      } as AxiosResponse;
    },
    transformRequest: [(data: any, headers: any) => JSON.stringify(data)],
  };

  // 获取拦截器处理后的配置
  const processedConfig = await axiosInstance.request(dummyAxiosConfig);

  try {
    const response = await fetch(axiosInstance.defaults.baseURL + url, {
      method,
      headers: processedConfig.headers as HeadersInit,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    return response;
  } catch (error) {
    // 错误处理
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was aborted');
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function mergeAbortSignals(
  signal1: AbortSignal,
  signal2: AbortSignal,
): AbortSignal {
  const controller = new AbortController();

  const onAbort = () => {
    controller.abort();
    // 清理事件监听器
    signal1.removeEventListener('abort', onAbort);
    signal2.removeEventListener('abort', onAbort);
  };

  if (signal1.aborted || signal2.aborted) {
    controller.abort();
  } else {
    signal1.addEventListener('abort', onAbort);
    signal2.addEventListener('abort', onAbort);
  }

  return controller.signal;
}
