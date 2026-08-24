import { defineConfig } from '@tanstack/start/config';

export default defineConfig({
  server: {
    preset: 'vercel',
  },
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
  },
});
