import type { RouteRecordRaw } from 'vue-router';

import { h } from 'vue';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'note',
    path: '/note',
    component: () => import('#/views/note/index.vue'),
    meta: {
      order: 2,
      icon: h('span', {
        class: 'icon-[ant-design--home-outlined]',
      }),
      title: $t('page.note.title'),
    },
  },
  {
    name: 'note-detail',
    path: '/note/detail/:id',
    component: () => import('#/views/note/detail.vue'),
    meta: {
      order: 6,
      icon: h('span', { class: 'icon-[solar--lightbulb-linear]' }),
      title: '知识库详情',
      hideInMenu: true,
      hideChildrenInMenu: true,
      activePath: '/note',
    },
  },
  {
    name: 'ask',
    path: '/ask',
    component: () => import('#/views/ask/index.vue'),
    meta: {
      order: 1,
      icon: h('span', { class: 'icon-[hugeicons--ai-chat-02]' }),
      title: $t('page.ask.title'),
    },
  },
  {
    name: 'subject',
    path: '/subject',
    component: () => import('#/views/subject/index.vue'),
    meta: {
      order: 3,
      icon: h('span', { class: 'icon-[solar--lightbulb-linear]' }),
      title: $t('page.subject.title'),
    },
  },
  {
    name: 'subject-detail',
    path: '/subject/detail/:id',
    component: () => import('#/views/subject/detail.vue'),
    meta: {
      order: 5,
      icon: h('span', { class: 'icon-[solar--lightbulb-linear]' }),
      title: '知识库使用指南',
      hideInMenu: true,
      hideChildrenInMenu: true,
      activePath: '/subject',
    },
  },
  {
    name: 'settings',
    path: '/settings',
    redirect: '/settings/profile',
    meta: {
      order: 4,
      hideInMenu: true,
      hideChildrenInMenu: true,
      title: '设置',
    },
    children: [
      {
        name: 'profile',
        path: 'profile',
        component: () => import('#/views/settings/profile/index.vue'),
        meta: {
          order: 41,
          title: '个人资料',
        },
      },
    ],
  },
];

export default routes;
