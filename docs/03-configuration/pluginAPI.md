---
title: 【Vite 插件 API】
date: "2025-09-10"
author: "mengwen"
published: true
excerpt: "插件 API"
---

# 插件 API

Vite 插件基于 Rollup 插件机制进行扩展，同时增加了一些 Vite 独有的功能点。这样写出来的插件，既能在开发模式下运行，也能在生产构建时生效。

> 在继续之前，建议先阅读 [Rollup 插件官方文档](https://cn.rollupjs.org)。

---

## 插件作者须知

在你打算开发一个 Vite 插件之前，请先熟悉 [Vite 的核心功能]，避免重复实现。你还可以先搜索下社区里是否已有现成插件，包括：

- 通用的 [Rollup 插件]
- Vite 专用的 [vite-plugin]

一般来说，在项目里直接写插件即可，不必单独发布成包。但如果发现插件有通用价值，可以考虑发布给社区使用。

**提示**：在调试或学习插件开发时，推荐安装 [vite-plugin-inspect]。它能让你查看插件管线中的中间状态，访问 `http://localhost:5173/__inspect/` 就能调试模块和插件调用情况。

---

## 命名规范

- 如果插件可以同时兼容 Vite 与 Rollup，则名字建议以 **`rollup-plugin-`** 或 **`vite-plugin-`** 开头。
- 在 `package.json` 中加上关键字：`"rollup-plugin"` 和 `"vite-plugin"`。

如果插件是 Vite 专属的：

- 名字建议用 **`vite-plugin-xxx`** 格式；
- 在 `package.json` 中至少包含 `"vite-plugin"` 关键字；
- 在文档说明里解释为什么只能用于 Vite（例如用了 Vite 独有的钩子）。

针对特定框架的插件：

- Vue 插件：`vite-plugin-vue-...`
- React 插件：`vite-plugin-react-...`
- Svelte 插件：`vite-plugin-svelte-...`

---

## 在配置中使用插件

用户安装插件后，会在 `vite.config.js` 或 `vite.config.ts` 里通过 `plugins` 选项引入：

```js
import vitePlugin from "vite-plugin-feature";
import rollupPlugin from "rollup-plugin-feature";

export default defineConfig({
  plugins: [vitePlugin(), rollupPlugin()],
});
```
