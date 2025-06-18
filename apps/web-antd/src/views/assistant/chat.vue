<script setup lang="ts">
import type { Ref } from 'vue';

import { ref } from 'vue';

import { Button, Select } from 'ant-design-vue';

import ChatAi from '#/components/ChatAi/index.vue';
import renderHtml from '#/components/Markdown/rederMardown.vue';
import { MockSSEResponse } from '#/views/ask/mock';

const fetchCancel: any = ref(null);
const loading: Ref<boolean> = ref(false);
// 流式数据加载中
const isStreamLoad: Ref<boolean> = ref(false);

const selectOptions = [
  {
    label: '默认模型',
    value: 'default',
  },
  {
    label: 'deepseek-r1',
    value: 'deepseek-r1',
  },
  {
    label: '混元',
    value: 'hunyuan',
  },
];
const selectValue = ref('default');
const isChecked = ref(false);
const checkClick = () => {
  isChecked.value = !isChecked.value;
};

const handleChange = (value: any, { index }: { index: number }) => {
  console.warn('handleChange', value, index);
};

const handleOperation = (type: string) => {
  console.warn('🚀 ~ handleOperation ~ type:', type);
};

// 倒序渲染// role:user/assistant/error/model-change/system
const chatList: Ref<any[]> = ref([
  {
    actions: false,
    content: `世上有多少好答案，正在苦等一个好问题`,
    role: 'system',
    reasoning: '',
    avatar: 'https://picsum.photos/100/100?t=1',
  },
]);

const onStop = function () {
  if (fetchCancel.value) {
    fetchCancel.value.controller.close();
    loading.value = false;
    isStreamLoad.value = false;
  }
};

const inputEnter = function (inputValue: string) {
  if (isStreamLoad.value) return;
  if (!inputValue) return;
  const params: any = {
    avatar: 'https://picsum.photos/100/100?t=2',
    name: '自己',
    datetime: new Date().toDateString(),
    content: inputValue,
    role: 'user',
  };
  chatList.value.unshift(params);
  // 空消息占位
  const params2 = {
    avatar: 'https://picsum.photos/100/100?t=1',
    name: 'TDesignAI',
    datetime: new Date().toDateString(),
    content: '',
    reasoning: '',
    role: 'assistant',
  };
  chatList.value.unshift(params2);
  handleData(inputValue);
};
const fetchSSE = async (fetchFn: Function, options: any) => {
  const response = await fetchFn();
  const { success, fail, complete } = options;
  // 如果不 ok 说明有请求错误
  if (!response.ok) {
    complete?.(false, response.statusText);
    fail?.();
    return;
  }
  const reader = response?.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  reader.read().then(function processText({
    done,
    value,
  }: {
    done: boolean;
    value: AllowSharedBufferSource;
  }) {
    if (done) {
      // 正常的返回
      complete?.(true);
      return;
    }
    const chunk = decoder.decode(value, { stream: true });
    const buffers: any = chunk.toString().split(/\r?\n/);
    const jsonData = JSON.parse(buffers);
    success(jsonData);
    reader.read().then(processText);
  });
};
const handleData = async (inputValue: string) => {
  loading.value = true;
  isStreamLoad.value = true;
  const lastItem = chatList.value[0];
  const mockedData = {
    reasoning: `嗯，用户问牛顿第一定律是不是适用于所有参考系。首先，我得先回忆一下牛顿第一定律的内容。牛顿第一定律，也就是惯性定律，说物体在没有外力作用时会保持静止或匀速直线运动。也就是说，保持原来的运动状态。`,
    content: `## Profile:
- language: 中⽂
- description: 你是⼀个律师，通过对⽤户的合同进⾏审查分析, 给出改进建议，帮助⽤户改进和完善合同。
## Goals:
- 对输⼊的合同⽂本审查分析后，指出合同的问题和存在的⻛险
- 对于改进和完善合同，给出建议
- 根据建议，修改具体的条款
- 给当事⼈提供专业的法律服务
## Constrains:
- 要依据正在适⽤的法律，不能引⽤废⽌的法律条⽂
- 要结合客户的⾏业，不能随意
- 要结合客户的要求，站在客户的⽴场，区分客户是甲方还是乙方、丙方等
- 要做出有利于客户的条款
- 对于客户不利的条款，要及时指出
## Skills:
- 精通中国大陆的法律，并能熟练引⽤法律发条
- 法律专业技能⾮常强，熟悉诉讼的程序和流程
- 经验⾮常丰富，擅⻓处理各种纠纷
- 对于客户的⾏业⾮常了解
-
## attention
1. **合同审查的基础思维**
- 熟悉客户业务模式
- 了解合同交易⾏为
2. **防控合同法律⻛险**
- 识别⻛险
- 提出防范措施及建议
3. **合同审查的重点问题**
- 审查必备条款核⼼条款是否完整
- 审查重点条款表述是否准确存在歧义
- 审查合同是否涉及⽆效情形
- 审查合同条款是否存在利益失衡
4. **合同审查的主要条款**
- 合同标题
- 合同主体
- 合同标的物相关条款
- 结算和⽀付条款
- 违约责任条款
- 争议解决条款
- 知识产权条款
- 合同⽣效条款及落款
## example
该份合同存在的问题：
-1.
-2.
对客户不利的条款：具体引⽤{ }条款，并解释原因
-1. { }；解释原因：
-2. { }；解释原因：
修改的建议：
-1.
-2.
-3.
-4.
N
修改的具体条款：
-将“xxx条款”修改为“ ”
-将“xxx条款”修改为“ ”
-将“xxx条款”修改为“ ”
## output format：
该份合同存在的问题：
-1.
-2.
对客户不利的条款：具体引⽤{ }，并解释原因
-1. { }；解释原因：
-2. { }；解释原因：
修改的建议：
-1
-2.
-3.
-4.
N
修改的具体条款：
-将“xxx条款”修改为“ ”
-将“xxx条款”修改为“ ”
-将“xxx条款”修改为“ ”

当收到“开始审查合同”指令时，请根据上述要求开始合同审查流程`,
  };
  const mockResponse = new MockSSEResponse(mockedData);
  fetchCancel.value = mockResponse;
  await fetchSSE(
    () => {
      return mockResponse.getResponse();
    },
    {
      success(result: any) {
        loading.value = false;
        lastItem.reasoning += result.delta.reasoning_content;
        lastItem.content += result.delta.content;
      },
      complete(isOk: boolean, msg: string) {
        if (!isOk) {
          lastItem.role = 'error';
          lastItem.content = msg;
          lastItem.reasoning = msg;
        }
        // 显示用时xx秒，业务侧需要自行处理
        lastItem.duration = 20;
        // 控制终止按钮
        isStreamLoad.value = false;
        loading.value = false;
      },
    },
  );
};
</script>
<template>
  <div
    class="relative h-full w-full bg-white"
    :class="$style.chat"
    :popupClassName="$style.chat"
  >
    <ChatAi
      :model-value="chatList"
      :loading="loading"
      :is-stream-load="isStreamLoad"
      @send="inputEnter"
      @stop="onStop"
      @expand-change="handleChange"
      @operation="handleOperation"
    >
      <template #prefix>
        <div class="flex items-center">
          <Select
            v-model:value="selectValue"
            :options="selectOptions"
            class="z-1000 mr-[10px] min-w-[130px]"
            :dropdown-style="{ zIndex: '9999' }"
          />
          <Button
            class="flex items-center"
            :class="{
              [$style.is_active]: isChecked,
              [$style.check_box]: true,
            }"
            variant="text"
            @click="checkClick"
          >
            <span class="icon-[tdesign--system-sum] mr-[5px]"></span>
            <span>深度思考</span>
          </Button>
        </div>
      </template>
      <template #assistant="{ row }">
        <renderHtml :content="row.content" :websearch_result="null" />
      </template>
    </ChatAi>
  </div>
</template>
<style lang="less" module>
.chat {
  :global {
    .ant-select-dropdown {
      z-index: 3000;
    }
  }
  .check_box {
    width: 112px;
    height: var(--td-comp-size-m);
    border-radius: 32px;
    border: 0;
    background: var(--td-bg-color-component);
    color: var(--td-text-color-primary);
    box-sizing: border-box;
    flex: 0 0 auto;
    font-size: 0.875rem;
  }

  .is_active {
    border: 1px solid var(--td-brand-color-focus);
    background: var(--td-brand-color-light);
    color: var(--td-text-color-brand);
  }
}
</style>
