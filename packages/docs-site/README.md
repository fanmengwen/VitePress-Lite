# 📖 VitePress‑Lite 文档站点（docs-site）

用 Vue 3 + Vite 实现一个轻量的文档站：Markdown 即页面，虚拟路由自动生成，内置 SEO 头部管理与两套预渲染方案，开发时 HMR 秒级生效，部署为纯静态也没负担。

## （亮点）

- Markdown 驱动：路由从 `docs/` 自动生成，页面用 `MarkdownPage.vue` 渲染
- 侧边栏可控：用 `sidebar.config.js` 做标题映射、排序和隐藏
- 本地代理：前端直连后端 API/AI 服务，前后端联调顺手
- 构建优化：手动分包、合并 CSS、`public/` 直拷贝

## 目录结构（关键部分）

- `src/router/index.ts`：合并静态路由 + 虚拟路由（`virtual:pages`）
- `plugins/virtual-pages-plugin.js`：扫描根仓库 `docs/**.md` 生成嵌套路由树
- `src/components/MarkdownPage.vue`：按路由拉取 `/docs/<path>.md`，解析 frontmatter 并渲染 HTML
- `src/composables/useSEO.ts`：统一设置 `<title>`/OG/Twitter/JSON‑LD 等元信息

## 快速开始

```bash
cd packages/docs-site
pnpm dev         # http://localhost:5173

```

## 文档来源与路由生成

1. 根目录 `docs/` 写 Markdown（如：`docs/02-core-concepts/hmr.md`）。

2. `virtual-pages-plugin` 扫描这些文件并生成嵌套路由，示例：

```
docs/02-core-concepts/hmr.md  →  /02-core-concepts/hmr
docs/01-getting-started/unit1.md  →  /01-getting-started/unit1
```

## 页面渲染与降级

- Frontmatter：在 Markdown 头部写元信息，前端解析后用于标题、作者、日期、SEO。

```markdown
---
title: "页面标题"
description: "一句话描述"
tags: [vite, vue]
author: "your-name"
date: "2025-01-01"
---
```

- 内容渲染：行内代码、代码块、列表/标题/引用等都做了基础处理，样式在 `styles/markdown-layout.css` 里统一。
- 降级保障：如果某个文档路径不存在或拉取失败，在页面里给出清晰的错误提示，SEO 版本也能正常输出基础结构。

## SEO 与预渲染

- 动态头部：用 `useSEO()` 统一注入 `<title>`、`description`、OG/Twitter、JSON‑LD 等。
- 轻量预渲染（`scripts/simple-prerender.js`）：不依赖浏览器，快速生成含 SEO 标签的 HTML 模板。
- 内容级预渲染（`scripts/content-prerender.js`）：真实渲染 Markdown → HTML，首屏直接是内容。
- 配套工具：`scripts/generate-sitemap.js` 生成 sitemap/robots，`scripts/test-seo.js` 做收录和标签检查。

常用命令：

```bash
pnpm prerender           # 轻量版
pnpm build:prerender     # 含真实内容
pnpm test:seo            # 生成 SEO 报告
```

## 本地代理（Vite server.proxy）

- AI 服务（默认指向 `http://localhost:8000`）：
  - `/api/chat`, `/api/vector-search`, `/api/conversations`, `/api/vector-store`, `/health`, `/system-info`

允许主机：`localhost`、`127.0.0.1`、`0.0.0.0`、`fanmengwen.com`

## 构建与性能

- 手动分包：
  - `markdown-engine`: `markdown-it`
  - `vue-core`: `vue`, `vue-router`
- CSS 合并：`cssCodeSplit: false`，打成单文件（减少请求）
- 产物命名：`assets/styles-[hash].css`、`assets/[name]-[hash][extname]`
- 静态资源：`public/` 原样复制到构建输出

## 侧边栏与显示控制（`sidebar.config.js`）

- `directoryTitles`：把技术目录名映射成更友好的中文标题
- `fileTitles`：对单个文件强制标题（优先级高于 frontmatter）
- `sortRules`：根级与子目录的显示顺序
- `displayOptions.hidden`：隐藏某些目录/文件

## 新增/更新文档的惯例

1. 在仓库根部 `docs/` 新建或修改 `.md`。
2. 写好 frontmatter，保存后路由自动出现；开发环境下 HMR 秒级更新。
3. 如需可索引版本，跑一次预渲染命令。

---

## 相关链接

- 前端文档（本页）：[../docs-site/README.md](../docs-site/README.md)
- 后端 API 文档：[../api-server/README.md](../api-server/README.md)
- 项目总览：[../../README.md](../../README.md)
