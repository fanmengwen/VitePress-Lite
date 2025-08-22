---
title: "【项目配置详解】"
author: "mengwen"
date: "2025-01-01"
published: true
excerpt: "项目配置详解"
---

# ⚙️ Vite 配置指南（vite.config.ts）

Vite 是一个轻量、快速的现代前端构建工具，提供了丰富的配置项来满足各种开发需求。所有配置都集中在根目录下的 `vite.config.ts` 或 `vite.config.js` 文件中。

---

## ✨ 快速示例

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
```
