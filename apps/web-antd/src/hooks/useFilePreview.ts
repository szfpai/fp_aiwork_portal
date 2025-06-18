import { computed, ref } from 'vue';

import { getFileTypeByMimeOrName } from '#/utils';

export function useFilePreview() {
  const fileUrl = ref('');
  const fileType = ref('');
  const rawText = ref('');
  const fileName = ref('');
  const loading = ref(false);

  const isImage = computed(() => fileType.value === 'image');
  const isPdf = computed(() => fileType.value === 'pdf');
  const isMarkdown = computed(() => fileType.value === 'markdown');
  const isCode = computed(() => fileType.value === 'code');
  const isText = computed(() => fileType.value === 'text');
  const isUnsupported = computed(
    () =>
      !isImage.value &&
      !isPdf.value &&
      !isMarkdown.value &&
      !isCode.value &&
      !isText.value,
  );

  async function loadFile(url: string, name: string = '') {
    loading.value = true;
    fileUrl.value = url;
    fileName.value = name;
    // const ext = name.split('.').pop()?.toLowerCase() || '';
    fileType.value = getFileTypeByMimeOrName(name);
    if (isText.value || isMarkdown.value || isCode.value) {
      const res = await fetch(url);
      rawText.value = await res.text();
    }
    loading.value = false;
  }

  return {
    fileUrl,
    fileType,
    fileName,
    rawText,
    loading,
    isImage,
    isPdf,
    isMarkdown,
    isCode,
    isText,
    isUnsupported,
    loadFile,
  };
}
