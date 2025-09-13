// @ts-expect-error types resolved at runtime
import vue from "@vitejs/plugin-vue";
// @ts-expect-error third-party plugin types optional
import markdownItAnchor from "markdown-it-anchor";
import path from "path";
import { defineConfig } from "vite";
// @ts-expect-error inspect plugin types optional
import inspect from "vite-plugin-inspect"; // 引入

import markdownTransformerPlugin from "./plugins/markdown-transformer-plugin";
import virtualPagesPlugin from "./plugins/virtual-pages-plugin";

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
    allowedHosts: ["localhost", "127.0.0.1", "0.0.0.0", "fanmengwen.com"],
    // Vite 已默认提供 SPA fallback，无需额外配置
    proxy: {
      // AI service endpoints - 更具体的规则放在前面
      "/api/chat": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/api/vector-search": {
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
  
  // 公共文件处理 - 将public目录的文件复制到构建输出
  publicDir: "public",
});
