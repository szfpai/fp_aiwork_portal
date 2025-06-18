import { onUnmounted, ref } from 'vue';

export interface SSEMessage {
  event: string;
  data: string;
  timestamp: string;
}

interface UseSSEChatOptions {
  url: string;
  onStart?: (data: SSEMessage) => void;
  onMessage?: (data: SSEMessage) => void;
  onDone?: (data: SSEMessage) => void;
  onError?: (err: any) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useSSEChat(options: UseSSEChatOptions) {
  const assistantMsg = ref('');
  const isStreaming = ref(false);
  const controller = new AbortController();

  let reconnectTimer: null | number = null;

  const readStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder,
    payload: Record<string, any>,
  ) => {
    try {
      const { done, value } = await reader.read();
      if (done) {
        isStreaming.value = false;
        return;
      }

      const text = decoder.decode(value);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          try {
            const data: SSEMessage = JSON.parse(jsonStr);
            const { event, data: eventData } = data;

            switch (event) {
              case 'done': {
                options.onDone?.(data);
                isStreaming.value = false;
                return;
              }
              case 'message': {
                assistantMsg.value += eventData;
                options.onMessage?.(data);
                break;
              }
              case 'start': {
                options.onStart?.(data);
                break;
              }
              default: {
                console.warn(`未知事件类型: ${event}`);
              }
            }
          } catch (error) {
            console.error('解析 SSE 数据失败:', error);
            options.onError?.(error);
            throw error;
          }
        }
      }

      await readStream(reader, decoder, payload); // 递归继续读取
    } catch (error) {
      console.error('SSE 读取异常:', error);
      isStreaming.value = false;
      options.onError?.(error);

      if (options.autoReconnect) {
        reconnectTimer = window.setTimeout(
          () => connect(payload),
          options.reconnectInterval || 3000,
        );
      }
      throw error;
    }
  };

  const connect = async (payload: Record<string, any>) => {
    isStreaming.value = true;
    assistantMsg.value = '';

    try {
      const response = await fetch(options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      console.log('🚀 ~ connect ~ response:', response.status);
      /* if (!(response.status >= 200 && response.status < 400)) {
        throw new Error('SSE 请求失败');
      } */

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        await readStream(reader, decoder, payload);
      }
    } catch (error) {
      console.error('SSE 请求失败:', error);
      isStreaming.value = false;
      options.onError?.(error);

      if (options.autoReconnect) {
        reconnectTimer = window.setTimeout(
          () => connect(payload),
          options.reconnectInterval || 3000,
        );
      }
      throw error;
    }
  };

  const close = () => {
    isStreaming.value = false;
    controller.abort();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };

  onUnmounted(() => {
    close();
  });

  return {
    connect,
    close,
    assistantMsg,
    isStreaming,
  };
}
