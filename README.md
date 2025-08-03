# VitePress-Lite

一个基于 Vue 3 + Vite 的轻量级文档站点生成器，类似于 VitePress 但更加简化和可定制。

## 📖 项目概述

VitePress-Lite 是一个现代化的静态文档站点生成器，它将 Markdown 文件自动转换为 Vue 单文件组件（SFC），支持热模块更新（HMR），并自动生成路由系统。该项目采用 monorepo 架构，专注于提供快速的开发体验和高质量的文档阅读体验。

## 🏗️ 项目架构

### 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite + Rollup
- **包管理**: pnpm (monorepo)
- **路由**: Vue Router 4
- **Markdown 处理**: markdown-it + gray-matter
- **样式**: CSS Modules + Scoped CSS

### 目录结构

```
VitePress-Lite/
├── packages/
│   └── docs-site/                 # 核心文档站点包
│       ├── docs/                  # Markdown 文档目录
│       │   ├── unit/             # 单元文档
│       │   └── total.md          # 主要文档
│       ├── src/                   # 源代码
│       │   ├── components/       # Vue 组件
│       │   ├── pages/            # 页面组件
│       │   ├── router/           # 路由配置
│       │   └── main.ts           # 应用入口
│       ├── plugins/              # 自定义 Vite 插件
│       │   ├── markdown-transformer-plugin.js  # Markdown 转换插件
│       │   └── virtual-pages-plugin.js         # 虚拟页面生成插件
│       └── vite.config.ts        # Vite 配置
├── package.json                   # 根包配置
└── pnpm-workspace.yaml           # pnpm 工作区配置
```

## 🔧 核心功能

### 1. Markdown 到 Vue SFC 转换

- **功能**: 自动将 `.md` 文件转换为 Vue 单文件组件
- **实现**: `markdown-transformer-plugin.js`
- **特性**:
  - 支持 frontmatter 元数据解析
  - 自动注入全局导航组件
  - 支持 markdown-it 插件扩展
  - 热模块更新支持

### 2. 虚拟路由生成

- **功能**: 自动扫描 `docs/` 目录，生成路由配置
- **实现**: `virtual-pages-plugin.js`
- **特性**:
  - 基于文件路径自动生成路由
  - 支持嵌套路由结构
  - 动态导入组件

### 3. 热模块更新 (HMR)

- **功能**: Markdown 文件修改时实时更新页面
- **实现**: WebSocket + 自定义事件
- **优势**: 无需刷新页面即可看到文档变更

### 4. 组件系统

- **GlobalNav**: 全局导航组件，自动生成所有页面链接
- **MarkdownList**: Markdown 文档列表组件
- **MarkdownCard**: 文档卡片组件，用于展示文档摘要

## 🚀 开发流程

### 环境要求

- Node.js >= 16
- pnpm >= 7

### 启动开发服务器

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 构建生产版本

```bash
# 构建项目
pnpm build
```

## 📝 使用方法

### 创建新文档

1. 在 `packages/docs-site/docs/` 目录下创建 `.md` 文件
2. 添加 frontmatter 元数据（可选）:
   ```yaml
   ---
   title: 文档标题
   date: "2025-01-01"
   author: "作者名"
   tags: ["标签1", "标签2"]
   ---
   ```
3. 编写 Markdown 内容
4. 文件保存后自动生成路由，可通过导航访问

### 文档组织

- `docs/` - 根文档目录
- `docs/unit/` - 单元文档（章节）
- 支持任意嵌套目录结构

## 🔌 插件系统

### Markdown 转换插件

**文件**: `packages/docs-site/plugins/markdown-transformer-plugin.js`

**功能**:

- 解析 frontmatter 元数据
- 使用 markdown-it 渲染 HTML
- 生成 Vue SFC 模板
- 实现 HMR 功能

**配置**:

```javascript
markdownTransformerPlugin({
  markdownItOptions: {
    html: true,
    linkify: true,
  },
  markdownItPlugins: [
    [markdownItAnchor, { permalink: true, permalinkSymbol: "#" }],
  ],
});
```

### 虚拟页面插件

**文件**: `packages/docs-site/plugins/virtual-pages-plugin.js`

**功能**:

- 扫描 `docs/**/*.md` 文件
- 生成虚拟模块 `virtual:pages`
- 自动创建路由配置

## 🔀 混合模式架构 (Hybrid Mode)

VitePress-Lite 支持 **"文件为源，数据库为本"** 的混合模式架构，完美结合了文件系统的版本管理优势和数据库的动态功能。

### 🏗️ 架构设计

#### 职责分工

- **`docs/` 目录 (文件系统)**:

  - 作为内容创作和编辑的源头
  - 保留 Git 版本管理、协作 Review 等优点
  - 支持 HMR 热更新，提供极致开发体验

- **数据库 (Post 表)**:
  - 作为内容的结构化存储和动态能力中心
  - 支持 API 查询、搜索、用户关联、评论、标签等功能
  - 存储从 Markdown 文件同步的内容和元数据

#### 混合渲染机制

- **静态内容**: 通过 Vite 插件直接从 `.md` 文件渲染，保证速度和 HMR
- **动态元数据**: 通过 API 从数据库获取作者、发布时间、标签等信息
- **优雅降级**: API 失败时仍可正常显示静态内容，不影响基本功能

### 🔄 文档同步系统

#### 同步脚本

**文件**: `packages/api-server/prisma/sync-docs.ts`

**核心功能**:

- 自动扫描 `packages/docs-site/docs/**/*.md` 文件
- 解析 frontmatter 元数据和 Markdown 内容
- 智能生成 slug (支持中文路径和嵌套结构)
- 使用 `upsert` 操作确保幂等性 (可重复执行)
- 自动提取或生成文章摘要
- 支持作者信息映射和默认值设置

**执行命令**:

```bash
# 同步所有文档到数据库
pnpm --filter api-server db:sync
```

#### 智能 Slug 生成

```
文件路径: docs/unit/vite-concepts.md
生成 Slug: unit/vite-concepts

文件路径: docs/guide/getting-started.md
生成 Slug: guide/getting-started

文件路径: docs/总览.md
生成 Slug: 总览
```

### 🚀 开发工作流

#### 新的开发流程

1. **编写/修改文档**: 在 `packages/docs-site/docs/` 目录下编辑 `.md` 文件

   ```bash
   # 实时预览和热更新
   pnpm dev
   ```

2. **同步到数据库**: 完成文档修改后，同步到数据库

   ```bash
   # 同步文档内容到数据库
   pnpm --filter api-server db:sync
   ```

3. **查看完整效果**: 刷新页面，看到静态内容 + 动态元数据的完美结合

#### 前端混合渲染示例

每个 Markdown 页面会显示：

**静态内容** (来自文件):

- Markdown 渲染的主要内容
- Frontmatter 中的基本信息
- 实时 HMR 更新

**动态元数据** (来自数据库):

- 作者信息 (头像、邮箱)
- 精确的创建/更新时间
- 发布状态标识
- 文章 ID 和统计信息

### 📝 Frontmatter 支持

```yaml
---
title: "文章标题"
author: "作者名称或邮箱" # 会自动映射到数据库用户
date: "2025-01-01"
published: true # 发布状态
excerpt: "自定义摘要" # 可选，不提供则自动生成
tags: ["Vue", "Vite"] # 标签支持 (未来功能)
---
```

### 🔧 配置和维护

#### 数据一致性

- **幂等同步**: 多次执行同步命令不会产生重复数据
- **增量更新**: 只更新修改过的文档，保持高效
- **作者映射**: 自动根据 frontmatter 中的作者信息关联数据库用户

#### 性能优化

- **懒加载**: 动态数据按需获取，不影响页面初始加载
- **缓存策略**: API 响应缓存，减少数据库查询
- **降级机制**: API 失败时优雅降级，保证用户体验

#### 数据清理

同步脚本会：

- 自动创建缺失的文章记录
- 更新已存在文章的内容和元数据
- 保留数据库中的额外信息 (评论、统计等)

### 🎯 使用场景

- **个人博客**: 享受 Markdown 编写体验 + 动态功能
- **技术文档**: 团队协作编写 + 用户评论互动
- **知识库**: 结构化内容管理 + 搜索和分类
- **教程站点**: 静态内容 + 用户进度跟踪

## 🎨 样式系统

- **全局样式**: `src/style.css`
- **组件样式**: 使用 Scoped CSS
- **主题色**: 绿色主题 (#42b983)
- **响应式设计**: 支持移动端适配

## 🔍 调试功能

- **Vite Inspector**: 集成 `vite-plugin-inspect` 用于调试
- **模块图**: 开发时输出模块依赖图
- **HMR 日志**: 控制台显示热更新信息

## 📦 构建配置

**开发模式**:

- 使用 Vite 开发服务器
- 支持 ES 模块热更新
- 端口: 3000

**生产模式**:

- 使用 Rollup 打包
- TypeScript 类型检查
- 生成优化的静态资源

## 🔗 关键依赖

### 运行时依赖

- `vue`: Vue 3 框架
- `vue-router`: 路由管理
- `markdown-it`: Markdown 解析器
- `gray-matter`: frontmatter 解析
- `fast-glob`: 文件扫描

### 开发依赖

- `vite`: 构建工具
- `@vitejs/plugin-vue`: Vue SFC 支持
- `typescript`: 类型系统
- `vite-plugin-inspect`: 调试工具

## 🚀 扩展指南

### 添加新的 Markdown 插件

在 `vite.config.ts` 中配置:

```javascript
markdownTransformerPlugin({
  markdownItPlugins: [[pluginName, pluginOptions]],
});
```

### 自定义主题

修改 `src/style.css` 和组件的 scoped 样式

### 添加新页面类型

1. 在 `src/pages/` 添加新的 Vue 组件
2. 在 `src/router/index.ts` 中添加静态路由

## 📄 许可证

MIT License

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

---

**项目特点**: 这是一个教学和实验性质的文档生成器，展示了如何使用 Vite 插件系统构建自定义的文档工具。代码结构清晰，易于理解和扩展，适合学习现代前端工具链的开发模式。
