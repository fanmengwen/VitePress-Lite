# VitePress-Lite

> 一个基于 Vue 3 + Vite 的现代化文档站点生成器，配备完整的 Node.js 后端服务

## 🎯 项目概述

VitePress-Lite 是一个全栈文档平台，实现了"**文件为源，数据库为本**"的混合架构。它通过自定义 Vite 插件将 Markdown 文件实时转换为 Vue 组件，同时提供用户认证、动态内容管理等后端功能。

## 🏗️ 项目架构 (Monorepo)

```
VitePress-Lite/
├── packages/
│   ├── docs-site/          # 🎨 前端文档站点
│   │   ├── docs/           # Markdown 源文件
│   │   ├── plugins/        # 自定义 Vite 插件
│   │   └── src/            # Vue 应用源码
│   └── api-server/         # 🛠️ 后端 API 服务
│       ├── src/            # Express 应用
│       ├── prisma/         # 数据库模式和迁移
│       └── __tests__/      # API 测试
└── pnpm-workspace.yaml    # pnpm 工作区配置
```

## 🚀 技术栈

**前端**: Vue 3 + TypeScript + Vite + Vue Router + 自定义插件  
**后端**: Node.js + Express + Prisma + SQLite/PostgreSQL  
**工程化**: pnpm workspace + 并行构建 + HMR + 代理配置

## ⚡ 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 一键启动

```bash
# 安装依赖
pnpm install

# 数据库初始化
pnpm db:migrate
pnpm db:seed

# 同时启动前后端服务
pnpm dev
```

🎉 **访问应用**：

- 📖 文档站点: http://localhost:5173
- 🔌 API 服务: http://localhost:3001

## 📜 常用命令

```bash
# 开发
pnpm dev              # 并行启动前后端
pnpm dev:docs         # 仅启动前端
pnpm dev:api          # 仅启动后端

# 构建
pnpm build            # 构建所有包
pnpm build:docs       # 构建文档站点
pnpm build:api        # 构建 API 服务

# 数据库
pnpm db:studio        # 打开数据库管理界面
pnpm db:sync          # 同步 Markdown 文件到数据库
pnpm db:reset         # 重置数据库并重新播种

# 测试
pnpm test             # 运行所有测试
pnpm test:api         # API 集成测试
```

## 🎨 核心特性

- ⚡ **实时渲染**: Markdown 文件修改时自动热更新
- 🔌 **插件系统**: 自定义 Vite 插件实现 MD → Vue SFC 转换
- 🗃️ **混合架构**: 静态文件 + 动态数据完美结合
- 🔐 **用户系统**: JWT 认证，支持注册/登录/个人资料
- 📝 **内容管理**: 文章的创建、编辑、发布状态控制
- 🔄 **自动同步**: 文件系统到数据库的智能同步

## 📚 深入了解

- **前端实现详解**: [packages/docs-site/README.md](./packages/docs-site/README.md)
- **后端 API 指南**: [packages/api-server/README.md](./packages/api-server/README.md)

## 🤝 开发者指南

1. Fork 项目并 clone 到本地
2. 按照**快速开始**步骤启动开发环境
3. 在 `packages/docs-site/docs/` 下编写 Markdown 文档
4. 运行 `pnpm db:sync` 同步内容到数据库
5. 提交更改并创建 Pull Request

## �� 许可证

MIT License
