import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": "/src",
    },
  },
  // Se usi Nitro / TanStack Start per Vercel, forza il runtime supportato (Node 20 o 22):
  nitro: {
    preset: "vercel",
    nodeVersion: "22.x",
  },
});
