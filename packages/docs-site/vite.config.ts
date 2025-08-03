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
});
