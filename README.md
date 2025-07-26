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
