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
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import taskLists from 'markdown-it-task-lists';
import mermaid from 'mermaid';
import { v4 as uuidv4 } from 'uuid';

import { quoteLabelPlugin } from '#/plugins/md';

import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import 'github-markdown-css/github-markdown-light.css';
import '#/theme/markdown-styles.css';

interface MarkdownRenderer {
  renderMarkdown: (markdown: string) => string;
  initMermaid: () => void;
  uid: string;
}

const MARKDOWN_CONFIG = {
  html: true,
  typographer: true,
  linkify: true,
  breaks: true,
} as const;

const LINK_ATTRIBUTES = {
  matcher: (href: string) => true, // 匹配所有链接，包括邮箱
  attrs: {
    target: '_blank',
    rel: 'noopener noreferrer',
  },
} as const;

const MERMAID_CONFIG = {
  startOnLoad: false,
} as const;

const PLUGINS = [
  { plugin: mila, options: LINK_ATTRIBUTES },
  { plugin: taskLists, options: { enabled: true } },
  { plugin: katex },
  { plugin: highlightjs },
  { plugin: container, options: 'tip' },
  { plugin: container, options: 'warning' },
  { plugin: container, options: 'danger' },
  { plugin: container, options: 'mermaid' },
  { plugin: container, options: 'code' },
  { plugin: sub },
  { plugin: sup },
  { plugin: deflist },
  { plugin: mark },
  { plugin: ins },
  { plugin: abbr },
  { plugin: footnote },
  { plugin: quoteLabelPlugin },
] as const;

export function useMarkdownRenderer(): [MarkdownIt, MarkdownRenderer] {
  const uid: string = uuidv4();
  const md = new MarkdownIt(MARKDOWN_CONFIG);
  // 确保 linkify 选项被正确设置
  md.linkify.set({
    fuzzyEmail: true,
    fuzzyLink: true,
    fuzzyIP: true,
    email: true,
    www: true,
  });
  PLUGINS.forEach(({ plugin, options }: any) => {
    md.use(plugin, { ...options, uid });
  });

  // 添加自定义的邮箱处理规则
  const defaultRender =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');

    if (hrefIndex >= 0) {
      const href = token.attrs[hrefIndex][1];

      // 是邮箱但没加 mailto 前缀
      if (href.includes('@') && !href.startsWith('mailto:')) {
        token.attrs[hrefIndex][1] = `mailto:${href}`;
      }

      // 添加 target 和 rel（不重复添加）
      if (token.attrIndex('target') === -1) {
        token.attrPush(['target', '_blank']);
      }
      if (token.attrIndex('rel') === -1) {
        token.attrPush(['rel', 'noopener noreferrer']);
      }
    }
    return defaultRender(tokens, idx, options, env, self);
  };

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

  function renderMarkdown(markdown: string): string {
    const rawHtml = md.render(typeof markdown === 'string' ? markdown : '');
    // 将邮箱转换为链接
    const html = rawHtml
      .replaceAll(
        /([\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi,
        '<a href="mailto:$1" rel="noopener noreferrer">$1</a>',
      )
      .replaceAll('http://xn--vxup8bm2mr36a.md', 'javascript:void(0)');
    return html;
  }

  function initMermaid() {
    const mermaidElements = document.querySelectorAll('.mermaid');
    if (mermaidElements.length === 0) return;
    try {
      mermaid.initialize(MERMAID_CONFIG);
      mermaid.init(undefined, '.mermaid');
    } catch (error) {
      console.error('Failed to initialize Mermaid:', error);
    }
  }

  return [md, { renderMarkdown, initMermaid, uid }];
}
