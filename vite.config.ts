import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      // Polyfill globals needed by simple-peer
      globals: {
        global: true,
        process: true,
        Buffer: true,
      },
    }),
  ],
  server: {
    port: 3000,
  },
});
