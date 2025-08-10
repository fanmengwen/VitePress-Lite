import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import markdownItAnchor from "markdown-it-anchor";
import path from "path";
import inspect from "vite-plugin-inspect"; // 引入

import virtualPagesPlugin from "./plugins/virtual-pages-plugin";
import markdownTransformerPlugin from "./plugins/markdown-transformer-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    inspect(),
    markdownTransformerPlugin({
      markdownItOptions: {
        html: true,
        linkify: true,
      },
      markdownItPlugins: [
        [markdownItAnchor, { permalink: true, permalinkSymbol: "#" }],
      ],
    }),
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    virtualPagesPlugin(),
    {
      name: "vite-moduleGraph",
      configureServer: (server) => {
        console.log(server.moduleGraph);
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      // AI service endpoints - 更具体的规则放在前面
      "/api/chat": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/api/vector-store": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/system-info": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // API server endpoints - 通用规则放在后面
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 🚀 Tree Shaking优化
    rollupOptions: {
      external: ["fs", "path"], // 排除Node.js模块
      output: {
        manualChunks: {
          "markdown-engine": ["markdown-it"],
          "vue-core": ["vue", "vue-router"],
        },
        // CSS优化：将所有CSS合并到单个文件中
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/styles-[hash].css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // CSS配置优化
    cssCodeSplit: false, // 关闭CSS代码分割，将所有CSS打包到一个文件
  },
});
