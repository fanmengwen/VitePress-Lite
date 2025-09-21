import vue from "@vitejs/plugin-vue";
import markdownItAnchor from "markdown-it-anchor";
import path from "path";
import { defineConfig } from "vite";
import inspect from "vite-plugin-inspect";

import markdownTransformerPlugin from "./plugins/markdown-transformer-plugin";
import virtualPagesPlugin from "./plugins/virtual-pages-plugin";

// Vite config optimized for running inside Docker containers in development.
// Key differences from vite.config.ts:
// - server.host = true to listen on 0.0.0.0
// - proxy targets use Docker service names instead of localhost
export default defineConfig({
  plugins: [
    inspect(),
    markdownTransformerPlugin({
      markdownItOptions: {
        html: true,
        linkify: true,
      },
      markdownItPlugins: [[markdownItAnchor, { permalink: true, permalinkSymbol: "#" }]],
    }),
    vue({ include: [/\.vue$/, /\.md$/] }),
    virtualPagesPlugin(),
  ],
  server: {
    host: true, // 0.0.0.0
    allowedHosts: ["localhost", "127.0.0.1", "0.0.0.0", "fanmengwen.com"],
    port: 5173,
    proxy: {
      // AI service endpoints
      "/api/chat": { target: "http://ai-service:8000", changeOrigin: true, secure: false },
      "/api/vector-search": { target: "http://ai-service:8000", changeOrigin: true, secure: false },
      "/api/vector-store": {
        target: "http://ai-service:8000",
        changeOrigin: true,
        secure: false,
      },
      "/health": { target: "http://ai-service:8000", changeOrigin: true, secure: false },
      "/system-info": { target: "http://ai-service:8000", changeOrigin: true, secure: false },

      // API server endpoints
      "/api": { target: "http://api-server:3001", changeOrigin: true, secure: false },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: ["fs", "path"],
      output: {
        manualChunks: {
          "markdown-engine": ["markdown-it"],
          "vue-core": ["vue", "vue-router"],
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "assets/styles-[hash].css";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    cssCodeSplit: false,
  },
  publicDir: "public",
});


