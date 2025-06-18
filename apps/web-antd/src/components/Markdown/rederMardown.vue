<!-- eslint-disable unicorn/prefer-dom-node-dataset -->
<!-- eslint-disable vue/prop-name-casing -->
<script setup lang="ts">
import {
  computed,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  render,
  watch,
} from 'vue';

import { EllipsisText } from '@vben/common-ui';

import {
  Avatar,
  AvatarGroup,
  Col,
  Drawer,
  Popover,
  Row,
  Space,
} from 'ant-design-vue';
import isEmpty from 'lodash/isEmpty';

import { useMarkdownRenderer } from '#/hooks/useMarkdownRenderer';
import { getFileIconByType } from '#/utils';

const props = defineProps<{
  content: string;
  metadata?: any;
  websearch_result?: any;
}>();
const html = ref<string>('');
const moreResultOpen = ref<boolean>(false);
const [, { renderMarkdown, uid }] = useMarkdownRenderer();

// 使用 WeakMap 缓存已处理的元素
const processedElements = new WeakMap<HTMLElement, boolean>();

const handleQuoteContent = (result: any) => {
  const websearch = result?.type === 'websearch';
  const href = websearch
    ? result.url
    : `${import.meta.env.VITE_GLOB_API_URL}${result.url}`;
  const extra = websearch
    ? [
        h(
          EllipsisText,
          {
            tooltip: false,
            class: 'text-sm text-muted-foreground !cursor-pointer',
            line: 2,
          },
          () => result.data,
        ),
        h('div', { class: 'text-sm flex items-center gap-1' }, [
          h('span', { class: 'text-[12px] icon-[hugeicons--internet]' }),
          h('span', { class: 'text-[12px]' }, '网页'),
        ]),
      ]
    : [
        h('div', { class: 'text-sm flex items-center gap-1' }, [
          h('span', {
            class: `text-[20px] ${getFileIconByType(result.name.split('.').pop())}`,
          }),
          h('span', { class: 'text-[12px]' }, result.name),
        ]),
      ];
  return h(
    'a',
    {
      target: '_blank',
      class: 'flex flex-col gap-1 hover:text-[initial]',
      href,
      rel: 'noopener noreferrer',
    },
    [
      h(
        'div',
        { class: 'text-[16px] font-bold' },
        websearch ? result?.name : null,
      ),
      ...extra,
    ],
  );
};
// 处理单个引用标签
function handleQuoteLabel(element: HTMLElement, quotes: any[]) {
  // 如果元素已经处理过，直接返回
  if (processedElements.has(element)) return;
  const label = element.dataset.label;
  if (!label) return;
  // 创建包装元素
  const wrapper = document.createElement('div');
  wrapper.className = 'quote-label-wrapper';
  const index = Number(element.getAttribute(`data-label`));
  const result = quotes?.[index];
  if (!result) return;
  // 创建 Popover 组件
  const width = result?.type === 'websearch' ? 'w-[380px]' : 'w-[200px]';
  const popover = h(
    Popover,
    {
      id: `popover-${index}`,
      overlayClassName: `${width} px-[30px] py-[10px]`,
      'arrow-point-at-center': true,
      content: handleQuoteContent(result),
      trigger: 'hover',
    },
    {
      default: () =>
        h(
          'span',
          { class: 'text-blue-500 cursor-pointer ml-[4px]' },
          element.innerHTML,
        ),
    },
  );
  // 使用 render 函数渲染
  const vnode = h('span', { class: 'quote-label-container' }, [popover]);
  render(vnode, wrapper);
  // 替换原始元素
  element.replaceWith(wrapper.firstElementChild!);
  // 标记为已处理
  processedElements.set(element, true);
}

// 使用 MutationObserver 监听 DOM 变化
let observer: MutationObserver | null = null;

// 初始化观察器
function initObserver() {
  // 检查浏览器是否支持 MutationObserver
  if (typeof MutationObserver === 'undefined') return;
  if (observer) observer.disconnect();
  const quotes = props.metadata?.quote ?? [];
  if (isEmpty(quotes)) return;
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // 检查新添加的节点
            const quoteLabels = node.querySelectorAll(`.quote-label-${uid}`);
            quoteLabels.forEach((el) =>
              handleQuoteLabel(el as HTMLElement, quotes),
            );
          }
        });
      }
    });
  });
  // 开始观察
  const markdownContainer = document.querySelector('.Markdown');
  if (markdownContainer) {
    observer.observe(markdownContainer, {
      childList: true,
      subtree: true,
    });
  }
}

// 清理函数
function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  // WeakMap 不需要手动清理，垃圾回收会自动处理
  // processedElements.clear();
}

// 监听内容变化
watch(
  () => [props.content, props.metadata],
  async ([content, metadata]) => {
    html.value = renderMarkdown(content);
    const quotes = metadata?.quote ?? [];
    if (isEmpty(quotes)) return;
    await nextTick();
    // 处理新渲染的内容
    const quoteLabels = document.querySelectorAll(`.quote-label-${uid}`);
    quoteLabels.forEach((el) => handleQuoteLabel(el as HTMLElement, quotes));
  },
  { immediate: true },
);

const calcMoreResultCount = computed(() => {
  const number = props.websearch_result?.results?.length ?? 0;
  return number > 6 ? 5 : number;
});

const handleMoreResult = () => (moreResultOpen.value = true);

onMounted(initObserver);

// 组件卸载时清理
onUnmounted(cleanup);
</script>

<template>
  <div :class="$style.markdown">
    <Row v-if="websearch_result?.query?.length > 0">
      <Col :span="24" :md="12" class="mb-2 md:mb-0">
        <div class="flex items-center gap-1">
          <span class="icon-[mage--search]"></span>
          <span class="text-muted-foreground text-sm">
            {{ websearch_result?.query }}
          </span>
        </div>
      </Col>
      <Col :span="24" v-if="!isEmpty(websearch_result?.engines)" :md="12">
        <div class="ml-auto flex shrink-0 items-center">
          <span class="text-muted-foreground mr-2 text-xs">搜索引擎:</span>
          <AvatarGroup :max-count="3" :max-style="{ display: 'none' }">
            <Avatar
              v-for="(item, index) in websearch_result.engines"
              :key="index"
              :alt="`${item.name}`"
              :size="14"
              :src="`https://icons.duckduckgo.com/ip3/${item.url}.ico`"
              class="bg-muted"
            />
          </AvatarGroup>
          <div class="flex items-center">
            <div class="mx-2 h-3 border-l"></div>
            <span class="text-muted-foreground text-xs">搜索数量：</span>
            <span class="">{{ websearch_result?.results?.length ?? 0 }}</span>
          </div>
        </div>
      </Col>
    </Row>
    <Space
      :size="12"
      class="my-[12px] flex w-full items-center overflow-x-auto"
      v-if="!isEmpty(websearch_result?.results)"
    >
      <a
        v-for="(item, index) in websearch_result.results.slice(
          0,
          calcMoreResultCount,
        )"
        :key="index"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:bg-muted flex w-40 shrink-0 cursor-pointer flex-col gap-2 rounded-md bg-slate-50 p-3 transition-colors duration-300 hover:text-[initial]"
      >
        <div class="line-clamp-2 h-10 text-xs leading-5 hover:text-[initial]">
          {{ item.title }}
        </div>
        <div class="flex w-full items-center gap-1 overflow-hidden text-xs">
          <img
            :alt="`https://icons.duckduckgo.com/ip3/${item.icon}.ico`"
            class="mr-[2px] mt-[2px] size-3"
            :src="`https://icons.duckduckgo.com/ip3/${item.icon}.ico`"
          />
          <div class="text-muted-foreground truncate">{{ item.icon }}</div>
        </div>
      </a>
      <div
        v-if="websearch_result.results.length > calcMoreResultCount"
        @click="handleMoreResult"
        class="hover:bg-muted flex w-40 shrink-0 cursor-pointer flex-col gap-2 rounded-md bg-slate-50 p-3 transition-colors duration-300"
      >
        <div class="line-clamp-2 h-10 text-xs leading-5">
          <span>查看更多</span>
          <span class="text-muted-foreground">
            {{ websearch_result.results.length - calcMoreResultCount }}
          </span>
          <span>个结果</span>
        </div>
        <AvatarGroup :max-count="3" :max-style="{ display: 'none' }">
          <Avatar
            v-for="(item, index) in websearch_result.engines"
            :key="index"
            :alt="`${item.name}`"
            :size="14"
            :src="`https://icons.duckduckgo.com/ip3/${item.url}.ico`"
            class="bg-[muted]"
          />
        </AvatarGroup>
      </div>
    </Space>
    <Drawer
      destroy-on-close
      v-model:open="moreResultOpen"
      title="联网搜索"
      placement="right"
      :width="480"
      :body-style="{ padding: '10px 0px' }"
      :header-style="{ padding: '10px' }"
    >
      <div v-for="(item, index) in websearch_result.results" :key="index">
        <a
          class="hover:bg-muted active:bg-muted-foreground/10 mx-2 flex shrink-0 cursor-pointer select-none flex-col gap-2 rounded-md p-3 transition-all duration-300 hover:text-[initial] active:scale-[0.99]"
          :href="item.link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="flex items-center gap-2 overflow-hidden">
            <img
              :alt="`https://icons.duckduckgo.com/ip3/${item.icon}.ico`"
              class="bg-muted size-3 shrink-0"
              :src="`https://icons.duckduckgo.com/ip3/${item.icon}.ico`"
            />
            <div class="flex-1 truncate text-sm text-blue-500">
              {{ item.title }}
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <div
                class="bg-muted flex size-5 items-center justify-center overflow-hidden rounded-full"
              >
                <img
                  :alt="`https://icons.duckduckgo.com/ip3/${item.icon}.ico`"
                  class="size-3"
                  :src="`https://icons.duckduckgo.com/ip3/${item.icon}.ico`"
                />
              </div>
              <div
                class="bg-muted-foreground/10 h-5 rounded-md px-2 text-xs leading-5"
                data-state="closed"
              >
                {{ `${item.score.toFixed(1)}` }}
              </div>
              <div
                class="bg-muted flex size-5 items-center justify-center overflow-hidden rounded-full"
              >
                <span
                  class="icon-[lucide--text-search] lucide lucide-text-search text-muted-foreground size-4"
                ></span>
              </div>
            </div>
          </div>
          <div class="text-muted-foreground truncate text-xs">
            {{ item.link }}
          </div>
          <div class="text-muted-foreground line-clamp-2 text-xs">
            {{ item.snippet }}
          </div>
        </a>
      </div>
    </Drawer>
    <div class="Markdown" v-html="html"></div>
  </div>
</template>

<style lang="less" module>
.markdown {
  margin-top: 12px;
  margin-left: 12px;
}
</style>
