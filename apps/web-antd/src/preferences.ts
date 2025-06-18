import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    authPageLayout: 'panel-right',
    enablePreferences: false, // 关闭偏好设置
    defaultHomePath: '/note',
    // loginExpiredMode: 'modal',
    enableRefreshToken: false,
    // accessMode: 'backend',
    layout: 'sidebar-mixed-nav',
    // 'https://picsum.photos/100/100?t=5'
    defaultAvatar: '',
  },
  theme: {
    mode: 'light',
  },
  logo: {
    enable: true,
    source: new URL('#/assets/img/logo.png', import.meta.url).href,
  },
  copyright: {
    enable: true,
    companyName: '浮点涌现',
    companySiteLink: '',
    date: '2025',
    icp: '',
    icpLink: '',
  },
  shortcutKeys: {
    enable: false,
  },
  widget: {
    fullscreen: false,
    globalSearch: false,
    /* refresh: false,
    sidebarToggle: false, */
    lockScreen: false,
    notification: false,
    themeToggle: false,
    languageToggle: false,
  },
  tabbar: {
    enable: false,
    showMaximize: false, // 关闭标签栏的最大化按钮
    wheelable: false,
    showMore: false,
  },
  breadcrumb: {
    enable: false,
  },
  sidebar: {
    collapsed: false,
    collapsedButton: false,
    extraCollapse: false,
    fixedButton: false,
    hidden: false,
    collapsedShowTitle: true,
    // width: 200,
  },
});
