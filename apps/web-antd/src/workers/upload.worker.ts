import { expose } from 'threads/worker';

// const delay = (t = 5000) => new Promise((r) => setTimeout(r, t));

function isValidFile(file: any): boolean {
  return (
    file instanceof Blob ||
    file instanceof File ||
    file instanceof ArrayBuffer ||
    file instanceof Uint8Array ||
    typeof file === 'string'
  );
}

let abortController: AbortController | null = null;

// 文件上传函数
async function uploadFile(payload: any) {
  try {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const { id, data = {}, headers = {} } = payload;
    const { file, fileName = '', ...rest } = data;
    if (!isValidFile(file)) {
      throw new Error(
        '无效的 file 类型，必须为 Blob、File、ArrayBuffer、Uint8Array 或 string',
      );
    }
    const blob =
      file instanceof Blob
        ? file
        : new Blob([file], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob, fileName);
    Object.entries(rest).forEach(([key, value]) => {
      formData.append(key, value?.toString() ?? '');
    });
    const url = `${import.meta.env.VITE_GLOB_API_URL}/console/api/v2/kb/${id}/documents`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: abortController?.signal,
      // { 'Content-Type': 'multipart/form-data' },
      headers: {
        ...headers,
      },
    });
    const result = await response.json();
    if (!response.ok || result?.code !== 200) {
      throw new Error(result?.message ?? `HTTP error ${response.status}`);
    }
    return result;
  } catch (error: any) {
    throw new Error(error?.message ?? error);
  }
}

const uploadWorker = {
  async run(payload: any) {
    try {
      return await uploadFile(payload);
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

expose(uploadWorker);
