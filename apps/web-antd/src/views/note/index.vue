<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { EllipsisText, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { useDebounceFn } from '@vueuse/core';
import {
  Avatar,
  Button,
  Col,
  Input,
  List,
  ListItem,
  message,
  Modal,
  Row,
  UploadDragger,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createNote,
  deleteNote,
  getNoteList,
  getSubjectList,
  uploadKbFile,
} from '#/api';
import Dropdown from '#/components/Dropdown/index.vue';
import Editor from '#/components/Editor/inedex.vue';
import { useAutoScrollToEnd } from '#/components/Editor/useAutoScrollToEnd';
import useImagePreview from '#/hooks/useImagePreview';
import useMarkdownConverter from '#/hooks/useMarkdownConverter';
import { useRxWorkerQueue } from '#/hooks/useRxWorkerQueuecopy';
import { delay, groupByDate } from '#/utils';

import NoteForm from './components/document.vue';
import Preview from './components/preview.vue';
import { dropDownOptions, handleActions } from './config';

const [InNoteModal, inNoteModalApi] = useVbenModal({
  connectedComponent: NoteForm,
});

// 创建队列实例
const queue = useRxWorkerQueue('upload', 2);

const { htmlToMarkdown } = useMarkdownConverter();
const userStore = useUserStore();
const accessStore = useAccessStore();

const [PreviewDrawer, previewApi] = useVbenDrawer({
  connectedComponent: Preview,
});

const state = reactive({
  note: '',
  loading: false,
  loadingMore: false,
  createLoading: false,
  isAddImg: false,
  isAddLink: false,
  preview: null as null | string,
  uploadFile: null as any,
  link: '',
  noteId: '',
  dataList: [] as any[],
  visible: false,
  prompt: '',
  knowledge_base: [] as any[],
  uploadLoading: false,
});
const uploadRefImg = ref<any>();

const { handleCreated, handleChange } = useAutoScrollToEnd();

const handleClick = async () => {
  state.createLoading = true;
  try {
    const md = htmlToMarkdown(state.note);
    await createNote(state.noteId, {
      title: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      content: md,
    });
    state.note = '';
    message.success('创建成功');
    refresh();
  } catch (error) {
    console.error('error:', error);
  } finally {
    state.createLoading = false;
  }
};

const handleDelete = async (row: any) => {
  try {
    await deleteNote(state.noteId, { doc_ids: [row.id] });
    message.success('删除成功');
    refresh();
  } catch (error) {
    console.warn('🚀 ~ handleDelete ~ error:', error);
  }
};

const handleMenuClick = async (e: any, row: any) => {
  const { key } = e?.item?._payload ?? {};
  if (key === 'edit') {
    // const url = `https://rag.oneai.art${row.file.url}`;
    // const title = row.file.name?.replace(/\.md$/, '') ?? '';
    /* const res = await fetch(url);
    if (!res.ok) throw new Error('获取 Markdown 文件失败');
    const result = await res.text();
    const content = markdownToHtml(result) as string; */
    inNoteModalApi
      .setData({
        row,
        doc_id: row?.id,
        noteId: state.noteId,
        refresh,
      })
      .open();
  }
  if (key === 'delete') {
    Modal.warning({
      title: '温馨提示',
      content: '您确定要删除该知识库？',
      okText: '确定',
      cancelText: '取消',
      centered: true,
      closable: true,
      maskClosable: false,
      onOk: async () => await handleDelete(row),
    });
  }
};

const hanldeUpload = async () => {
  try {
    state.uploadLoading = true;
    const file = state.uploadFile;
    const arrayBuffer = await file.arrayBuffer();
    const payload = {
      id: state.noteId,
      data: { file: arrayBuffer, fileName: file.name, parse_now: true },
      headers: {
        Authorization: `Bearer ${accessStore.accessToken}`,
      },
    };
    await queue.enqueue(payload, {
      maxRetries: 0,
    });
    await delay(1000);
  } catch (error) {
    console.warn('🚀 ~ hanldeUpload ~ error:', error);
  }
};

const hanldeUploadLink = async () => {
  const regex =
    /\b((https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+(:\d+)?(\/[\w./?%&=#-]*)?)\b/gi;
  if (!regex.test(state.link)) {
    message.error('请输入正确的链接');
    return;
  }
  try {
    state.uploadLoading = true;
    const formData = new FormData();
    Object.entries({
      url: state.link,
      parse_now: true,
    }).forEach(([key, value]) => {
      formData.append(key, value?.toString() ?? '');
    });
    await uploadKbFile(state.noteId, formData);
    await delay(1000);
    state.link = '';
    message.success('添加成功');
    refresh();
  } catch (error) {
    console.warn('🚀 ~ hanldeUploadLink ~ error:', error);
  } finally {
    uploadCancel(false);
  }
};

queue.taskSubject.subscribe((task: any) => {
  if (['error'].includes(task?.status)) {
    uploadCancel();
    message.error(task?.error ?? '上传失败');
  }
  if (['success'].includes(task?.status)) {
    message.success('上传成功');
    uploadCancel();
    refresh();
  }
});

const refresh = async () => {
  try {
    state.loading = true;
    if (state.noteId.length === 0) {
      const res = await getSubjectList();
      state.knowledge_base = res?.data ?? [];
      state.knowledge_base.forEach((item: any) => {
        if (item.department?.name === userStore.userInfo?.name) {
          const kb = item.sub_knowledge_base?.[0]?.sub_knowledge_base?.[0];
          if (kb?.id) state.noteId = kb.id;
        }
      });
    }
    if (state.noteId.length > 0) {
      const knowledge = await getNoteList(state.noteId);
      const result = groupByDate(
        knowledge?.data ?? [],
        (item: any) => item?.process_begin_at,
      );
      state.dataList = Object.values(result);
    }
  } catch (error) {
    console.warn('🚀 ~ refresh ~ error:', error);
  } finally {
    state.loading = false;
  }
};

const customRequest = ({ file }: any) => {
  const { preview } = useImagePreview();
  state.uploadFile = file;
  state.preview = preview(file);
  uploadRefImg.value?.clearFiles?.();
};

const beforeUpload = (file: File): boolean => {
  const isLt20M = file.size / 1024 / 1024 < 20;
  if (!isLt20M) {
    message.error('文件大小不能超过 20MB!');
    return false;
  }
  return true;
};

const uploadCancel = (clean: boolean = true) => {
  state.isAddImg = false;
  state.isAddLink = false;
  state.link = '';
  state.preview = null;
  state.uploadFile = null;
  state.uploadLoading = false;
  !!clean && queue.cleanup();
};

const addLinkCancel = () => {
  state.isAddLink = false;
  state.link = '';
};

const commitNote = useDebounceFn((type: 'img' | 'link') => {
  type === 'img' && hanldeUpload();
  type === 'link' && hanldeUploadLink();
}, 300);

const isDisabled = computed(() => {
  return state.createLoading || !state.note || state.note === '<p><br></p>';
});

const handlePreview = (item: Record<string, any>) => {
  previewApi.setData({ title: item?.file?.name, url: item?.file?.url }).open();
};

onMounted(() => {
  refresh();
});
</script>
<template>
  <div
    :class="[
      $style.container,
      { [$style.container_mobile]: preferences.app.isMobile },
    ]"
  >
    <div :class="$style.header">
      <div :class="$style.title">个人知识库</div>
      <Button
        type="text"
        class="mr-[16px] flex items-center justify-center"
        @click="refresh"
        :loading="state.loading"
      >
        <template #icon>
          <span class="icon-[hugeicons--refresh] text-[16px]"></span>
        </template>
      </Button>
      <Input
        size="large"
        placeholder="搜索笔记 (⌘+K)"
        class="w-[500px] bg-[#e5e5e6]"
        @keydown.enter="refresh"
      >
        <template #prefix>
          <span class="icon-[iconamoon--search]"></span>
        </template>
      </Input>
    </div>
    <div :class="$style.editor" v-loading="state.createLoading">
      <Editor
        v-model="state.note"
        @on-created="handleCreated"
        @on-change="handleChange"
      />
      <Button
        type="text"
        :disabled="isDisabled"
        class="absolute bottom-[32px] right-[15px] px-[10px]"
        @click="handleClick"
      >
        <!-- <span class="icon-[iconoir--send]"></span> -->
        <span
          class="icon-[iconoir--send] text-[20px] text-[#4290f7]"
          :class="{ 'text-[#e5e5e6]': isDisabled }"
        ></span>
      </Button>
    </div>
    <div :class="$style.actions">
      <h3 class="mb-[12px] mt-[36px] text-[16px] font-bold text-[#adb3be]">
        你还可以
      </h3>
      <div
        v-if="state.isAddLink || state.isAddImg"
        class="relative flex cursor-pointer rounded-[16px] bg-white px-[30px] py-[20px]"
      >
        <div v-if="state.isAddLink" class="flex w-full items-center gap-5">
          <Button class="h-[40px]" @click="addLinkCancel"> 取消 </Button>
          <Input
            size="large"
            v-model:value="state.link"
            placeholder="粘贴或者输入链接"
            class="flex-1"
          >
            <template #prefix>
              <span class="icon-[lucide--square-dashed-bottom-code]"></span>
            </template>
          </Input>
          <!-- <Popover
            placement="top"
            v-model:open="state.visible"
            :mouse-leave-delay="0"
            :z-index="calcZIndex()"
            trigger="click"
          >
            <template #content>
              <Input
                size="large"
                v-model="state.prompt"
                placeholder="整理这个链接的核心内容"
                class="w-[300px]"
              />
            </template>
            <div class="instruct">
              <img
                class="w-[44px]"
                src="https://piccdn2.umiwi.com/fe-oss/default/MTcyMTcyMTcwMTM4.png"
              />
            </div>
          </Popover> -->
          <Button
            :disabled="!state.link || state.link.length === 0"
            :loading="state.uploadLoading"
            class="h-[40px]"
            type="primary"
            @click="commitNote('link')"
          >
            生成笔记
          </Button>
        </div>
        <div v-if="state.isAddImg" class="flex w-full items-center gap-5">
          <Button class="h-[40px]" @click="uploadCancel"> 取消 </Button>
          <template v-if="!state.preview || state.preview.length === 0">
            <UploadDragger
              ref="uploadRefImg"
              :multiple="false"
              :show-upload-list="false"
              :before-upload="beforeUpload"
              :custom-request="customRequest"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            >
              <div class="flex items-center text-[14px]">
                <span
                  class="icon-[ion--cloud-upload-outline] text-[20px]"
                ></span>
                <span class="ml-[8px]">点此添加 或 拖拽、粘贴图片到这里</span>
              </div>
            </UploadDragger>
            <div class="text-[12px] text-[#8A8F99]">
              大小 20M 以内<br />支持 JPG、PNG、JPEG 格式
            </div>
          </template>
          <div v-else class="flex flex-1 items-center gap-5">
            <div class="flex flex-1 items-center gap-2" v-viewer>
              <img
                class="h-[40px] rounded-[5px] border border-gray-200"
                :src="state.preview"
                alt=""
              />
              <div class="text-[12px]">
                {{ state.uploadFile.name }}
              </div>
            </div>
            <Button
              :loading="state.uploadLoading"
              class="h-[40px]"
              type="primary"
              @click="commitNote('img')"
            >
              生成笔记
            </Button>
          </div>
        </div>
      </div>
      <Row :gutter="[20, 20]" v-if="!state.isAddImg && !state.isAddLink">
        <Col
          :xs="24"
          :sm="24"
          :md="8"
          v-for="item of handleActions"
          :key="item.url"
          @click="() => item.onClick(state)"
        >
          <div
            class="relative flex cursor-pointer rounded-[16px] bg-white px-[30px] py-[20px]"
          >
            <Avatar
              v-if="item.tag"
              class="absolute right-[11px] top-[0px] h-[18px] w-[28px]"
              :src="item.tag"
            />
            <Avatar class="mr-[12px]" :size="42" :src="item.url" />
            <div class="flex flex-col">
              <div class="text-[16px] font-medium text-[#111418]">
                {{ item.name }}
              </div>
              <div class="mt-[4px] text-[12px] text-[##8a8f99]">
                {{ item.description }}
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
    <List
      item-layout="horizontal"
      :data-source="state.dataList"
      :loading="{ spinning: state.loading, size: 'large' }"
    >
      <template #loadMore v-if="state.loadingMore">
        <div
          :style="{
            textAlign: 'center',
            marginTop: '12px',
            height: '32px',
            lineHeight: '32px',
          }"
        >
          <span>loading more</span>
        </div>
      </template>
      <template #renderItem="{ item }">
        <!-- 时间标识 -->
        <h3
          class="mb-[12px] mt-[36px] text-[16px] font-bold text-[#111418]"
          v-if="item.children.length > 0"
        >
          {{ item.content }}
        </h3>
        <!-- parser_id: web (网页链接) 、image(图片) -->
        <template v-for="c in item.children" :key="c.id">
          <ListItem class="cursor-pointer bg-white" @click="handlePreview(c)">
            <div
              class="border-b border-dashed border-gray-200 pb-[16px]"
              :class="$style.content"
            >
              <EllipsisText class="!cursor-pointer" :line="3" :tooltip="false">
                {{ c?.file?.summary ?? c?.progress_msg ?? '' }}
              </EllipsisText>
            </div>
            <div class="flex justify-between pt-[14px]">
              <div class="text-[12px] text-[#8a8f99]">
                创建于 {{ c.process_begin_at }}
              </div>
              <Dropdown
                placement="bottomRight"
                :options="dropDownOptions"
                @click="(e: any) => handleMenuClick(e, c)"
              />
            </div>
          </ListItem>
        </template>
      </template>
    </List>
    <InNoteModal />
    <PreviewDrawer />
  </div>
</template>
<style lang="less" module>
.container {
  padding: 76px 15px 15px;
  min-height: 100vh;
  .header {
    width: 100%;
    flex-shrink: 0;
    height: 76px;
    display: flex;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding-left: 95px;
    background-color: #f1f3f6;
    .title {
      margin-right: 16px;
      color: #111418;
      font-size: 24px;
      font-style: normal;
      font-weight: 500;
      line-height: normal;
      white-space: nowrap;
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    :global {
      .ant-input {
        background-color: #e5e5e6;
      }
    }
  }
  /* 控制编辑区域滚动而不是整体撑大 */
  .editor {
    position: relative;
    padding: 25px 15px;
    border-radius: 16px;
    margin-bottom: 36px;
    background-color: #fff;
    &:hover {
      box-shadow:
        0px 4px 8px 0px rgba(0, 0, 0, 0.02),
        0px 8px 16px 0px rgba(161, 167, 181, 0.16);
    }
  }
  .content {
    margin-top: 3px;
    margin-bottom: 12px;
    color: #292d34;
    font-size: 14px;
    user-select: text;
  }
  .actions {
    :global {
      .cursor-pointer {
        &:hover {
          box-shadow:
            0px 4px 8px 0px rgba(0, 0, 0, 0.02),
            0px 8px 16px 0px rgba(161, 167, 181, 0.16);
        }
      }
    }
  }
  :global {
    .ant-upload-drag {
      border: none !important;
      .ant-upload-btn {
        position: relative;
        width: max-content;
        color: rgb(255, 255, 255);
        cursor: pointer;
        padding: 9px 20px !important;
        background: linear-gradient(
          271deg,
          rgb(118, 106, 246) 0.12%,
          rgb(148, 111, 255) 99.88%
        );
        border-radius: 12px;
      }
    }

    .w-e-text-container {
      min-height: 100px;
      max-height: 300px;
      overflow-y: auto;
      margin-top: -15px;
    }
    .ant-list-item {
      position: relative;
      display: block;
      padding: 14px 20px;
      margin-top: 12px;
      border-radius: 16px;
      border-block-end: none !important;
      &:hover {
        box-shadow:
          0px 4px 8px 0px rgba(0, 0, 0, 0.02),
          0px 8px 16px 0px rgba(161, 167, 181, 0.16);
      }
    }
  }
}
.container_mobile {
  .header {
    top: 50px;
    padding: 0 15px;
    .title {
      margin-right: 0;
    }
  }
}
</style>
