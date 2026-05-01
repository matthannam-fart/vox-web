import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { execSync } from "node:child_process";

// Build-time app version: short git SHA, or fall back to "dev".
const gitSha = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
})();

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      process.env.VITE_APP_VERSION ?? gitSha,
    ),
  },
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
