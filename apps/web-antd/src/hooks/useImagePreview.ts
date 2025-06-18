import { ref } from 'vue';

export default function useImagePreview() {
  const url = ref<null | string>(null);

  function preview(file: File) {
    if (url.value) URL.revokeObjectURL(url.value);
    if (file && file.type.startsWith('image/')) {
      url.value = URL.createObjectURL(file);
    }
    return url.value;
  }

  function clear() {
    if (url.value) {
      URL.revokeObjectURL(url.value);
      url.value = null;
    }
  }

  return { preview, clear };
}
