// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Тимчасова адреса на GitHub Pages.
// Після підключення власного домену: site → 'https://ваш-домен', base → '/'.
export default defineConfig({
  site: 'https://marynahurak.github.io',
  base: '/praxis',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'uk',
        locales: { uk: 'uk-UA', en: 'en' },
      },
    }),
  ],
});
