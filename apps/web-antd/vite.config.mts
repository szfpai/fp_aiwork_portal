/* eslint-disable regexp/no-unused-capturing-group */
import path from 'node:path';
import process from 'node:process';

import { defineConfig } from '@vben/vite-config';

import strip from 'vite-plugin-strip';

export default defineConfig(async () => {
  const isDev = process.env.NODE_ENV === 'development';
  return {
    application: {},
    vite: {
      plugins: [
        strip({
          enabled: !isDev,
        }),
      ],
      worker: {
        format: 'es',
      },
      build: {
        // 支持 import.meta.url
        target: 'esnext',
        minify: 'terser',
        assetsInlineLimit: 0,
        cssCodeSplit: true,
        cssMinify: true,
        terserOptions: {
          compress: {
            drop_console: !isDev,
            drop_debugger: !isDev,
          },
        },
        rollupOptions: {
          output: {
            entryFileNames: 'assets/js/[hash].js',
            chunkFileNames: 'assets/js/[hash].js',
            assetFileNames: (assetInfo: any) => {
              const ext = assetInfo.name?.split('.').pop();
              const name = assetInfo.name || '';
              if (!ext || !name) return 'assets/extra/[hash]';
              if (/\.(png|jpe?g|gif|svg|webp)$/.test(name)) {
                return 'assets/img/[hash].[ext]';
              }
              if (/\.(css)$/.test(name)) {
                return 'assets/css/[hash].[ext]';
              }
              if (/\.(woff2?|ttf|eot|otf)$/.test(name)) {
                return 'assets/fonts/[hash].[ext]';
              }
              if (/\.(mp3|wav|ogg|aac|flac|mp4|webm|mov)$/.test(name)) {
                return 'assets/media/[hash].[ext]';
              }
              return 'assets/extra/[hash].[ext]';
            },
          },
        },
      },
      css: {
        preprocessorOptions: {
          less: {
            javascriptEnabled: true,
          },
        },
        extract: true,
        modules: {
          generateScopedName: '[local]-[hash:base64:5]',
        },
        devSourcemap: true,
        codeSplit: false,
      },
      resolve: {
        alias: {
          '#': path.resolve('./src'),
        },
      },
      optimizeDeps: {
        include: ['vue', 'threads'],
      },
      server: {
        // 允许的 Host
        allowedHosts: ['www.digitmulin.glbdns.com'],
        /* proxy: {
          '/console': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/console/, ''),
            // mock代理目标地址
            // target: 'http://60.191.58.38:8820/console',
            target: 'https://rag.oneai.art/console',
            // target: 'https://ragdev.oneai.art/console',
            ws: true,
          },
        }, */
      },
    },
  };
});
