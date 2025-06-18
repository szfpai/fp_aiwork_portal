<script setup>
import { ref, watch } from 'vue';

import Editor from '@wangeditor/editor-for-vue';
import { marked } from 'marked';
import TurndownService from 'turndown';

// Props: 可以接收初始markdown或html
const props = defineProps({
  modelValue: { type: String, default: '' },
  initialMode: { type: String, default: 'wysiwyg' }, // 'wysiwyg' or 'markdown'
});
const emit = defineEmits(['update:modelValue']);

// 本地状态
const mode = ref(props.initialMode);
const markdownContent = ref(props.modelValue);
const htmlContent = ref('');

// 初始化：根据modelValue推断内容类型
function initContent() {
  if (mode.value === 'wysiwyg') {
    // 如果传入的是markdown，则转html
    htmlContent.value = marked.parse(props.modelValue);
  } else {
    // markdown模式
    markdownContent.value = props.modelValue;
  }
}
initContent();

// 编辑器配置
const editorConfig = {
  placeholder: '请输入内容...',
};

// turndown 服务：html->markdown
const turndownService = new TurndownService();

// 从富文本同步到 markdown
function syncToMarkdown(editorHtml) {
  const md = turndownService.turndown(editorHtml);
  markdownContent.value = md;
  emit('update:modelValue', editorHtml);
}

// 从 markdown 同步到富文本
function syncToHtml() {
  const html = marked.parse(markdownContent.value);
  htmlContent.value = html;
  emit('update:modelValue', markdownContent.value);
}

// 监听外部 modelValue 更新
watch(
  () => props.modelValue,
  (val) => {
    if (mode.value === 'wysiwyg') {
      htmlContent.value = marked.parse(val);
    } else {
      markdownContent.value = val;
    }
  },
);
</script>

<template>
  <div class="markdown-wang-editor">
    <div class="toggle-bar flex justify-end space-x-2 p-2">
      <button
        @click="mode = 'wysiwyg'"
        :class="mode === 'wysiwyg' ? 'font-bold' : ''"
        class="rounded px-3 py-1"
      >
        富文本
      </button>
      <button
        @click="mode = 'markdown'"
        :class="mode === 'markdown' ? 'font-bold' : ''"
        class="rounded px-3 py-1"
      >
        Markdown
      </button>
    </div>
    <div
      v-if="mode === 'wysiwyg'"
      class="editor-container"
      style="height: 400px"
    >
      <Editor
        v-model="htmlContent"
        :default-config="editorConfig"
        @on-change="syncToMarkdown"
      />
    </div>
    <div v-else class="markdown-container p-2">
      <textarea
        v-model="markdownContent"
        @input="syncToHtml"
        class="h-96 w-full rounded border p-2 font-mono"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.markdown-wang-editor {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.toggle-bar button {
  background: #f3f4f6;
}

.toggle-bar button.font-bold {
  color: white;
  background: #3b82f6;
}
</style>
