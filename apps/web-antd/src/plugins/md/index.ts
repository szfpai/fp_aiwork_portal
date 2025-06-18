import MarkdownIt from 'markdown-it';

export function quoteLabelPlugin(md: MarkdownIt, options: any) {
  const { uid = '' } = options;
  md.inline.ruler.before(
    'emphasis',
    'quote_label',
    (state: any, silent: any) => {
      const start = state.pos;
      // const max = state.posMax;
      const src = state.src;
      const slice = src.slice(start);
      // 支持 <quote-label>10</quote-label> 和 <quote-label>10</quote>
      const match = slice.match(
        /^<(quote-label|quote)>(\d+)<\/(quote-label|quote)>/,
      );
      if (!match) return false;
      const openTag = match[1];
      const label = match[2];
      const closeTag = match[3];
      // 判断合法组合：<quote-label>10</quote-label> 或 <quote-label>10</quote>
      const validPairs = [
        ['quote-label', 'quote-label'],
        ['quote-label', 'quote'],
        ['quote', 'quote'],
      ];
      const isValid = validPairs.some(
        ([open, close]) => open === openTag && close === closeTag,
      );
      if (!isValid) return false;
      if (!silent) {
        const token = state.push('html_inline', '', 0);
        token.content = `<span class="quote-label-${uid}" data-label="${label}">[${Number(label) + 1}]</span>`;
      }
      // 更新当前位置
      state.pos += match[0].length;
      return true;
    },
  );
}

// 添加 quote-label 标签替换规则
/*   md.inline.ruler.before(
    'emphasis',
    'quote_label',
    (state: any, silent: any) => {
      const start = state.pos;
      const max = state.posMax;
      // 检查是否以 <quote-label> 开始
      if (state.src.slice(start, max).indexOf('<quote-label>') !== 0) {
        return false;
      }
      // 找到结束标签的位置
      const endTagPos = state.src.indexOf('</quote-label>', start);
      if (endTagPos === -1) {
        return false;
      }
      // 提取标签内容
      const label = state.src.slice(start + 13, endTagPos).trim();
      if (!silent) {
        // 创建新的 token
        const token = state.push('html_inline', '', 0);
        token.content = `<span class="quote-label cursor-pointer bg-[#eff1f3] px-[3px] ml-[2px]" data-label="${label}">[${Number(label) + 1}]</span>`;
      }
      // 更新解析位置
      state.pos = endTagPos + 14;
      return true;
    },
  ); */
