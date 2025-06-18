/* eslint-disable unicorn/prefer-dom-node-remove */
import { h } from 'vue';

import { Spin } from 'ant-design-vue';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import { Base64 } from 'js-base64';
import JSEncrypt from 'jsencrypt';

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(isSameOrAfter);

/**
 * 公钥
 */
const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwUOfCyvF7bSyYw5hwlW5
s4IxEyZf4AMp6Ur46EACazKnPpsszpxDdEvFhOQa5grv8x8AO3XYAKAFVGU3DKmO
AoXLdc26WxWZVgzBmvB6GfZTe0L3Zw4TA+vwjzCeC5RNeUqle8AmTkxIaeXDpTkq
zWf+f8TjIJz1qV3IfGn+Y0mjpjMbLD1REsBDLPsZwOMZ7aFPmpnqgzxX3dTrZwFM
1rg58mpc+0abkAXahkZVR0DFWx7X9raZThFZB65s5u97r63dngzUwTw1wcv9g1b3
Eczr9R8Mm3YLnTRPzS7Wq1efqQvwUYoM3jCgFfsAnDpW6wCLoYCUKkyXfD3UqUVT
lQIDAQAB
-----END PUBLIC KEY-----`;

/**
 * 私钥
 */
const DEFAULT_PRIVATEKEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEAwUOfCyvF7bSyYw5hwlW5s4IxEyZf4AMp6Ur46EACazKnPpss
zpxDdEvFhOQa5grv8x8AO3XYAKAFVGU3DKmOAoXLdc26WxWZVgzBmvB6GfZTe0L3
Zw4TA+vwjzCeC5RNeUqle8AmTkxIaeXDpTkqzWf+f8TjIJz1qV3IfGn+Y0mjpjMb
LD1REsBDLPsZwOMZ7aFPmpnqgzxX3dTrZwFM1rg58mpc+0abkAXahkZVR0DFWx7X
9raZThFZB65s5u97r63dngzUwTw1wcv9g1b3Eczr9R8Mm3YLnTRPzS7Wq1efqQvw
UYoM3jCgFfsAnDpW6wCLoYCUKkyXfD3UqUVTlQIDAQABAoIBAA3fO3R1bzrObFdf
5Eowg4EVW9qFGlOmkAoVoPHiUqg62nkeAAaCgUJpLkzp1rFGxKE9iYpA63jISxxz
rrJrBrjUhlH91R9CRPboKP/Gr5MGJh4HhF7FaTY6QMoZfDMLgkhJw6M0H8lsR0RR
fMeUZrGH6umFvNgL1i0xeKxJ/hUbhd6YTneSBIOsqXtNKnkY7LUIQEKSwphk7TeK
mGuTuJhFqRbQ8re9I9EZPWhl0vUz1Fj3EcVxALMNqH7A58nFLfZnCu+4cg7o83et
GxaOp7Tw4twPIUVYBi6kAiFgBb1m46cNXLuwOlYhGCcOvSBTc1Bp7MYL5K00slDv
3RLEQQECgYEA82CmRRHkU5W0bDtDwK6XHtKbQfDn2Nkaocx/2FblDf1OlAyUOByb
EoxovrOHiy+WjUP6t0OC10gSVTrVgGdNkpMFu0gTcG1BaMtt1Z9cdVEBdbKKVZbW
s5S8UpSRJXEkGFUNOSDTUXRp6ByKaotSnUQkJmFAvZ8XEQDWTr5fV7ECgYEAz5+A
wYzbylnGGmsSlTKpEs0qXKBFapYxEn0W2XkU2W+kUz6CE8rA9rV6KlcXFOz9vVfw
1mFKWgA27Dxy16oYGR2xFdMWC3ieebdGVywb54ocUXAhLfIbl+CHDGGxGxFzDKzz
M7BuCLbXAFkiU4Mgz2YXfpF2WXcHGRdSnMeF49kCgYBFWSYTofM6bYFhIVDXzYeb
/kVA6MokNItYqjdozGkWRdxd6FkoKeq2qpZ79ZtvNvc4mAYrAzQpQ/k0kbmtJ3ys
jUdkbYQ3KRBqZ9eodWObaeJgwhu0Kdfuj5pGUNFGWh1NH0apGrS2MWSCtLaZm9CP
jqkU1AaK98C1CgC3+VfFIQKBgBvG04Q9Zp9Wod1zRpdn+ZzwJivEt7+GvD8BrGhH
+qZGxCH4sBkpDbVNrdkEq8sNLINznmuvLZy3IfKIA3poCU2AOk3aMBFcEp0xBhNA
iyE8BvIhnfPbTYfb6v4GVQITcuZxOMghT70DVLKTc8lzNPKGe2TiSDP4qjYOyzGS
cWiBAoGAKGWJ+KlGwnDrmftcXYOogAk2csUeDiPzv4VYAVn+yZ1XKoYu4Wg9pLZj
z7AEBMtBySSd8+bR08kTqsmGS3VCMDSNdvhXvPIdK+MSYdEcqnTbi+49hrbGRY5n
ymt+g9KZFXUr7DdsGbFyTy8l7Am6aLg49BkhAp5ohdAvLOmvDOY=
-----END RSA PRIVATE KEY-----`;

export function loadMapToLocalStorage(name: string) {
  try {
    const stored = localStorage.getItem(name);
    if (!stored) return new Map();
    const parsed = JSON.parse(stored);
    // 确保是二维数组格式
    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => Array.isArray(item) && item.length === 2)
    ) {
      console.warn('ADMIN_ACCOUNT 格式不正确，已重置为空 Map');
      return new Map();
    }
    return new Map(parsed);
  } catch (error) {
    console.error('读取 ADMIN_ACCOUNT 失败：', error);
    return new Map();
  }
}

/**
 * 获取最大的zIndex值
 */
export function calcZIndex() {
  /**
   * 排除ant-message和loading:9999的z-index
   */
  const zIndexExcludeClass = ['ant-message', 'loading'];
  const isZIndexExcludeClass = (element: Element) => {
    return zIndexExcludeClass.some((className) =>
      element.classList.contains(className),
    );
  };

  let maxZ = 0;
  const elements = document.querySelectorAll('*');
  [...elements].forEach((element) => {
    const style = window.getComputedStyle(element);
    const zIndex = style.getPropertyValue('z-index');
    if (
      zIndex &&
      !Number.isNaN(Number.parseInt(zIndex)) &&
      !isZIndexExcludeClass(element)
    ) {
      maxZ = Math.max(maxZ, Number.parseInt(zIndex));
    }
  });
  return maxZ + 1;
}

export function getBase64WithFile(
  file: File,
): Promise<{ file: File; result: string }> {
  return new Promise((resolve, reject) => {
    const reader: FileReader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve({ file, result: reader.result });
      } else {
        reject(new Error('Failed to convert file to Base64 string'));
      }
    });
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * delay
 */

export const delay = (t: number = 1000) => new Promise((r) => setTimeout(r, t));

/**
 * 使用公钥加密密码
 */
export function rsaEncrypt(
  password: string,
  publicKey: string = DEFAULT_PUBLIC_KEY,
): false | string {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(publicKey);
  const encoded = Base64.encode(password); // 可省略，防乱码更稳妥
  return encryptor.encrypt(encoded);
}

/**
 * 使用私钥解密密文
 */
export function rsaDecrypt(
  encrypted: string,
  privateKey: string = DEFAULT_PRIVATEKEY,
): false | string {
  const decryptor = new JSEncrypt();
  decryptor.setPrivateKey(privateKey);
  const decryptedBase64 = decryptor.decrypt(encrypted);
  if (!decryptedBase64) return false;
  return Base64.decode(decryptedBase64);
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const LoadingComponent = () => {
  return h(
    'div',
    {
      class: 'w-full h-full flex items-center justify-center',
    },
    [h(Spin, { size: 'large' })],
  );
};

/**
 * 将数据按时间分类：今天、昨天、过去七天、更早
 * @param items 数据数组
 * @param getTimeFn 获取时间字段的方法，返回 Date、字符串或 dayjs 对象
 */
export function groupByDate<T>(
  items: T[],
  getTimeFn: (item: T) => Date | dayjs.Dayjs | string,
) {
  const result = {
    today: {
      content: '今天',
      children: [] as T[],
    },
    yesterday: {
      content: '昨天',
      children: [] as T[],
    },
    last7days: {
      content: '过去7天',
      children: [] as T[],
    },
    earlier: {
      content: '更早',
      children: [] as T[],
    },
  };
  const sevenDaysAgo = dayjs().subtract(7, 'day').startOf('day');
  for (const item of items) {
    const time = dayjs(getTimeFn(item));
    if (time.isToday()) {
      result.today.children.push(item);
    } else if (time.isYesterday()) {
      result.yesterday.children.push(item);
    } else if (time.isSameOrAfter(sevenDaysAgo)) {
      result.last7days.children.push(item);
    } else {
      result.earlier.children.push(item);
    }
  }
  return result;
}

export function getFileTypeByMimeOrName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'unknown';

  if (['bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(ext))
    return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['md'].includes(ext)) return 'markdown';
  if (['csv', 'log', 'txt'].includes(ext)) return 'text';
  if (
    [
      'c',
      'cpp',
      'css',
      'html',
      'java',
      'js',
      'json',
      'py',
      'ts',
      'vue',
    ].includes(ext)
  )
    return 'code';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext))
    return 'office';

  return 'unknown';
}

export function getFileIconByType(type: string): string {
  const reg = new RegExp(`\\.${type}$`, 'i');
  if (
    ['.bmp', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'].some((v) =>
      reg.test(v),
    )
  ) {
    return 'icon-[lets-icons--img-box]';
  }
  const iconMap: Record<string, string> = {
    doc: 'icon-[vscode-icons--file-type-word]',
    docx: 'icon-[vscode-icons--file-type-word]',
    excel: 'icon-[vscode-icons--file-type-excel2]',
    pdf: 'icon-[vscode-icons--file-type-pdf2]',
    image: 'icon-[lets-icons--img-box]',
    md: 'icon-[vscode-icons--file-type-markdown]',
    text: 'icon-[solar--file-text-outline]',
    dir: 'icon-[clarity--directory-solid]',
  };

  return iconMap[type] ?? 'icon-[bx--file]';
}

export function getFileSize(size: number): string {
  if (Number.isNaN(size)) return '0.0B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / 1024 ** index).toFixed(2)} ${units[index]}`;
}

export async function downloadFile(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename; // .replace(/\.[^/.]+$/, '');
  document.body.append(link);
  link.click();
  document.body.removeChild(link);
  /*   try {
    const ext = url.split('.').pop();
    const res = await fetch(url);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename.replace(/\.[^/.]+$/, `.${ext}`);
    document.body.append(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('🚀 ~ downloadFile ~ error:', error);
  } */
}
