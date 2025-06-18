// useMarkdownConverter.ts
import { marked } from 'marked';
import TurndownService from 'turndown';

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
  /* headerIds: true,
  mangle: false, */
});

export default function useMarkdownConverter() {
  // 创建 Turndown 实例（HTML -> Markdown）
  const turndownService = new TurndownService({
    codeBlockStyle: 'fenced',
  });

  // 自定义规则（示例：保留 <br>）
  turndownService.addRule('break', {
    filter: 'br',
    replacement: () => '  \n',
  });
  turndownService.addRule('atxHeaders', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (content: string, node: any) => {
      const hLevel = Number(node.nodeName.charAt(1));
      return `\n${'#'.repeat(hLevel)} ${content}\n\n`;
    },
  });

  return {
    /** Markdown -> HTML */
    markdownToHtml: (md: string) => marked.parse(md),

    /** HTML -> Markdown */
    htmlToMarkdown: (html: string) => turndownService.turndown(html),
  };
}
