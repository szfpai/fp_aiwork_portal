<!-- eslint-disable unicorn/no-array-reduce -->
<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';

import { EllipsisText, useVbenModal } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { Col, message, Modal, Row, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';
import isEmpty from 'lodash/isEmpty';

import { deleteSubject, getSubjectList } from '#/api';
import Dropdown from '#/components/Dropdown/index.vue';

import SubjectForm from './components/subject.vue';
import { subjectDropDownOptions } from './configs';

const router = useRouter();
const userStore = useUserStore();

const state = reactive({
  loading: false,
  dataList: [] as any[],
  knowledge_base: [] as any[],
  sub_knowledge_base: [] as any[],
});

const [InSubjectModal, inSubjectModalApi] = useVbenModal({
  connectedComponent: SubjectForm,
});

const handleClick = (item: any) => {
  router.push(
    `/subject/detail/${item.id}?dpt_id=${
      item?.department?.id
    }&type=${item.is_folder ? 'folder' : 'file'}`,
  );
};

const handleDelete = async (row: any) => {
  try {
    await deleteSubject(row.id);
    message.success('删除成功');
    refresh();
  } catch (error) {
    console.warn('🚀 ~ handleDelete ~ error:', error);
  }
};

const handleMenuClick = (e: any, row: any) => {
  const { key } = e?.item?._payload ?? {};
  if (key === 'edit') {
    inSubjectModalApi
      .setData({
        sub_knowledge_base: state.sub_knowledge_base,
        row,
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

const refresh = async () => {
  try {
    state.loading = true;
    const res = await getSubjectList();
    state.knowledge_base = res?.data ?? [];
    state.sub_knowledge_base = [];
    state.dataList = state.knowledge_base.reduce((acc: any, item: any) => {
      if (!isEmpty(item.sub_knowledge_base)) {
        state.sub_knowledge_base.push(...item.sub_knowledge_base);
        // acc.push(...item.sub_knowledge_base);
        item.sub_knowledge_base.forEach((sub: any) => {
          if (!isEmpty(sub.sub_knowledge_base)) {
            acc.push(...sub.sub_knowledge_base);
          }
        });
      }
      return acc;
    }, []);
  } catch (error) {
    console.warn('🚀 ~ refresh ~ error:', error);
  } finally {
    state.loading = false;
  }
};

const createSubject = () => {
  inSubjectModalApi
    .setData({
      sub_knowledge_base: state.sub_knowledge_base,
      refresh,
    })
    .open();
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
    <div :class="$style.header" class="pb-[10px]">
      <div :class="$style.title">知识库</div>
      <div :class="$style.description">让记录和管理知识变得前所未有的轻松</div>
    </div>
    <Spin :spinning="state.loading" size="large">
      <Row :gutter="[20, 20]" :wrap="true" class="pt-[10px]">
        <Col
          :xs="12"
          :sm="12"
          :md="6"
          :class="$style.card"
          @click="createSubject"
        >
          <div :class="[$style.card_container, $style.card_create]">
            <div :class="$style.card_content">
              <span class="icon-[line-md--file-document-plus]"></span>
              <h2>创建一个知识库</h2>
            </div>
          </div>
        </Col>
        <template v-for="item in state.dataList" :key="item.id">
          <Col
            :xs="12"
            :sm="12"
            :md="6"
            :class="$style.card"
            @click="handleClick(item)"
          >
            <!--  · {{ item.sub_kbs_num }}人在用 -->
            <div :class="[$style.card_container, $style.card_info]">
              <div :class="$style.card_info_header">
                <EllipsisText :class="$style.card_info_title" :line="2">
                  {{ item.name }}
                </EllipsisText>
                <div :class="$style.card_info_meta">
                  {{
                    item.is_folder
                      ? item.sub_knowledge_base?.length
                      : item?.doc_num
                  }}个内容
                </div>
              </div>
              <div :class="$style.card_info_header">
                <div :class="$style.card_author">
                  <div
                    :class="$style.card_author_time"
                    v-if="item.department?.name === userStore.userInfo?.name"
                  >
                    私有 · {{ dayjs(item.created_at).format('MM月DD日') }}
                  </div>
                  <div
                    :class="$style.card_author_team"
                    class="flex items-center"
                    v-else
                  >
                    <!-- <Avatar :size="20" :src="item.avatar" class="mr-[8px]" /> -->
                    <span class="text-[13px] text-black">
                      {{ item.department?.name }}
                    </span>
                  </div>
                  <Dropdown
                    placement="bottomRight"
                    @click="(e: any) => handleMenuClick(e, item)"
                    :options="subjectDropDownOptions"
                  />
                </div>
              </div>
            </div>
          </Col>
        </template>
      </Row>
    </Spin>
    <InSubjectModal />
  </div>
</template>
<style lang="less" module>
.container {
  padding: 86px 15px 15px;
  .header {
    width: 100%;
    flex-shrink: 0;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding-left: 95px;
    background-color: #f1f3f6;
    .title {
      margin-right: 16px;
      margin-top: 18px;
      color: #111418;
      font-weight: 500;
      font-size: 24px;
    }
    .description {
      margin-top: 4px;
      color: #677084;
      font-size: 14px;
    }
  }
  .card {
    box-sizing: border-box;
    .card_container {
      height: 187px;
      background: #ffffff;
      cursor: pointer;
      border-radius: 8px;
      overflow: hidden;
      box-sizing: border-box;
      &:hover {
        box-shadow:
          0px 4px 8px 0px rgba(0, 0, 0, 0.02),
          0px 8px 16px 0px rgba(161, 167, 181, 0.16);
      }
    }

    .card_create {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed #e5e6ea;
      .card_content {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #8a8f99;
        span {
          font-size: 32px;
        }
        h2 {
          margin-top: 10px;
          font-size: 16px;
          font-weight: 500;
        }
      }
      &:hover {
        .card_content {
          color: black;
        }
      }
    }
    .card_info {
      position: relative;
      .card_info_header {
        padding: 16px;
        padding-bottom: 0;
      }
      .card_info_title {
        font-size: 18px;
        font-weight: 500;
        color: #111418;
      }
      .card_info_meta {
        margin-top: 8px;
        font-size: 12px;
        color: #8a8f99;
        display: flex;
        align-items: center;
      }
      .card_author {
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
        color: #8a8f99;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
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
