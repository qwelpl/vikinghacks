import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest.json";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: "src",
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL("./src/popup/index.html", import.meta.url)),
        blocked: fileURLToPath(new URL("./src/blocked/index.html", import.meta.url)),
      },
    },
  },
});