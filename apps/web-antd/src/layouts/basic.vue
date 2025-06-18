<script lang="ts" setup>
import { computed, defineAsyncComponent, h, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  AuthenticationLoginExpiredModal,
  useVbenDrawer,
} from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { BasicLayout, UserDropdown } from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { FloatButton } from 'ant-design-vue';

import useDraggable from '#/hooks/useDraggable';
import { useAssStore, useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const assStore = useAssStore();
const { destroyWatermark, updateWatermark } = useWatermark();

const grepShowAss = ['/ask'];
const router = useRouter();
const assistantRef = ref<HTMLElement>();
const assistantContainer = ref<HTMLElement>();
useDraggable(assistantContainer, assistantRef);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

const [AssistantDrawer, assistantApi] = useVbenDrawer({
  connectedComponent: defineAsyncComponent(
    () => import('#/layouts/assistant.vue'),
  ),
});

async function handleLogout() {
  await authStore.logout(false);
}

const handleClick = () => {
  assistantApi?.setData({ key: 'chat' }).open();
};

const menus = [
  {
    icon: h('span', { class: 'icon-[mdi--account-cog-outline]' }),
    text: '个人资料',
    class: {
      'bg-accent': router.currentRoute.value.path === '/settings/profile',
    },
    handler: () => {
      router.push('/settings/profile');
    },
  },
];

onMounted(() => {
  if (assistantApi) {
    assStore.setAssInstance(assistantApi);
  }
});

watch(
  () => preferences.app.watermark,
  async (enable) => {
    if (enable) {
      await updateWatermark({
        content: `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
      return;
    }
    destroyWatermark();
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown v-if="preferences.app.isMobile">
      <UserDropdown
        :avatar="avatar"
        :text="userStore.userInfo?.name"
        :description="userStore.userInfo?.email"
        @logout="handleLogout"
        :menus="menus"
        tag-text=""
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar="avatar"
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
      <AssistantDrawer />
      <FloatButton
        shape="circle"
        :badge="{ count: 5, overflowCount: 999 }"
        class="right-[30px] top-[50%] h-[50px] w-[50px]"
        @click="handleClick"
        ref="assistantContainer"
        v-if="!grepShowAss.includes(router.currentRoute.value.path)"
      >
        <template #icon>
          <span
            ref="assistantRef"
            class="icon-[token-branded--ais] scale-[2.2] text-[#4290f7]"
          ></span>
        </template>
      </FloatButton>
    </template>
  </BasicLayout>
  <teleport to="#collapse-button" v-if="!preferences.app.isMobile">
    <UserDropdown
      :avatar="avatar"
      :text="userStore.userInfo?.name"
      :description="userStore.userInfo?.email"
      @logout="handleLogout"
      menu-content-class="mr-0 ml-[20px] mb-[8px]"
      menu-trigger-class="ml-[18px] mr-0 translate-y-[-10px]"
      :menus="menus"
      tag-text=""
    />
  </teleport>
</template>
