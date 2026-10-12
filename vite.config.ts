import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'learning-hub:csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => {
        const charset = /<meta charset="UTF-8"\s*\/?>/i;
        if (!charset.test(html)) throw new Error('index.html needs <meta charset="UTF-8" />');
        const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`;
        return html.replace(charset, (tag) => `${tag}\n    ${meta}`);
      },
    },
  };
}

function copyCourseImagesPlugin(): Plugin {
  const src = join(import.meta.dirname, 'data/courses/images');
  const dest = join(import.meta.dirname, 'public/courses/images');
  return {
    name: 'learning-hub:copy-course-images',
    buildStart() {
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
    },
    configureServer() {
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  base: '/learning-hub/',
  plugins: [
    copyCourseImagesPlugin(),
    cspPlugin(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'icons/icon.svg',
        'icons/favicon.ico',
        'icons/pwa-64x64.png',
        'icons/pwa-192x192.png',
        'icons/pwa-512x512.png',
        'icons/maskable-icon-512x512.png',
        'icons/apple-touch-icon-180x180.png',
      ],
      manifest: {
        name: 'Course Tracker',
        short_name: 'Курсы',
        description: 'Офлайн-трекер прогресса по курсам.',
        start_url: '/learning-hub/',
        scope: '/learning-hub/',
        display: 'standalone',
        background_color: '#0e0f13',
        theme_color: '#0e0f13',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
  },
});
