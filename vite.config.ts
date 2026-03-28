import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest.json";
import path from "path";

export default defineConfig({
  root: "src",
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve("src/popup/index.html"),
        blocked: path.resolve("src/blocked/index.html"),
        login: path.resolve("src/login/index.html")
      },
    },
  },
});