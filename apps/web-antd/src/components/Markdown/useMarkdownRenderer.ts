import { nextTick, onMounted } from 'vue';

import MarkdownIt from 'markdown-it';
import abbr from 'markdown-it-abbr';
import container from 'markdown-it-container';
import deflist from 'markdown-it-deflist';
import footnote from 'markdown-it-footnote';
import highlightjs from 'markdown-it-highlightjs';
import ins from 'markdown-it-ins';
import katex from 'markdown-it-katex';
import mila from 'markdown-it-link-attributes';
import mark from 'markdown-it-mark';
// import mathjax from 'markdown-it-mathjax3';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import taskLists from 'markdown-it-task-lists';
import mermaid from 'mermaid';

import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
// import 'vditor/dist/index.css'; //vditor-reset vditor-preview

export function useMarkdownRenderer() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })
    .use(mila, {
      attrs: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    })
    /* .use(
      mathjax,
      {
        // 第一参数示例配置
        tex: {
          inlineMath: [
            ['$', '$'],
            [String.raw`\(`, String.raw`\)`],
          ],
          displayMath: [
            ['$$', '$$'],
            [String.raw`\[`, String.raw`\]`],
          ],
        },
      },
      {
        // 第二参数示例配置，通常是MathJax的配置
        loader: { load: ['input/tex', 'output/svg'] },
      },
    ) */
    .use(taskLists, { enabled: true })
    .use(katex)
    .use(highlightjs)
    .use(container, 'tip')
    .use(container, 'warning')
    .use(container, 'danger')
    .use(container, 'mermaid')
    .use(container, 'code')
    .use(sub)
    .use(sup)
    .use(deflist)
    .use(mark)
    .use(ins)
    .use(abbr)
    .use(footnote);

  // 渲染mermaid代码块插件
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (
    tokens: any,
    idx: number,
    options: any,
    env: any,
    self: any,
  ) => {
    const token = tokens[idx];
    if (token.info.trim() === 'mermaid') {
      return `<div class="mermaid">${token.content}</div>`;
    }
    return defaultFence
      ? defaultFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };

  // 渲染函数 vditor-reset vditor-preview
  function renderMarkdown(markdown: string): string {
    const html = md.render(typeof markdown === 'string' ? markdown : '');
    // 等 DOM 渲染完后再初始化 mermaid
    /* requestAnimationFrame(() => {
      const hasMermaid = html.includes('class="mermaid"');
      if (hasMermaid) {
        mermaid.initialize({ startOnLoad: false });
        mermaid.init(undefined, '.mermaid');
      }
    }); */
    return html;
  }

  // 初始化mermaid（可以放在Vue的onMounted中）
  function initMermaid() {
    const mermaidElements = document.querySelectorAll('.mermaid');
    if (mermaidElements.length === 0) return;
    mermaid.initialize({ startOnLoad: false });
    mermaid.init(undefined, '.mermaid');
  }

  onMounted(async () => {
    await nextTick();
    initMermaid();
  });

  return [md, { renderMarkdown, initMermaid }];
}
