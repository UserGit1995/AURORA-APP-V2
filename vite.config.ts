import { defineConfig } from '@tanstack/start/config';

export default defineConfig({
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
  },
});
