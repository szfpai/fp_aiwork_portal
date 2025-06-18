/* eslint-disable unicorn/text-encoding-identifier-case */
import { expose } from 'threads/worker';

type SSEMessage = {
  data?: any;
  type: 'close' | 'error' | 'message';
};

interface SSEPayload {
  id: string;
  data?: Record<string, any>;
  headers?: Record<string, string>;
  baseUrl?: string;
}

let abortController: AbortController | null = null;

const sseWorker = {
  async run(payload: SSEPayload) {
    try {
      const { id, data = {}, headers = {} } = payload;
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();
      const url = `${import.meta.env.VITE_GLOB_API_URL}/console/api/chat/${id}/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
        signal: abortController.signal,
        credentials: 'omit',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (!response.body) {
        throw new Error('Response body is null');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          postMessage({ type: 'close' } as SSEMessage);
          return { type: 'success' };
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // 如果最后一行不完整，就留下来等下次再拼接
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data: Record<string, any> = JSON.parse(line.slice(6));
            postMessage({
              type: 'message',
              data,
            } as SSEMessage);
          } catch (error: any) {
            console.warn('🚀 ~ lines.forEach ~ error:', line.slice(6));
            throw error?.message ?? error;
          }
        }
      }
    } catch (error: any) {
      throw new Error(error?.message ?? error);
    }
  },
  abort() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  },
};

expose(sseWorker);
