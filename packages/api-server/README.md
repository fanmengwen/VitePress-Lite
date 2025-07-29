# 🛠️ VitePress-Lite API 服务器

> 基于 Node.js + Express + Prisma 的现代化 API 服务，为文档站点提供用户认证和内容管理功能

## 🎯 服务概述

本 API 服务器实现了完整的后端功能，支持：

- **用户认证系统**：注册、登录、JWT 令牌验证
- **文章管理**：CRUD 操作、发布状态控制、作者关联
- **数据同步**：Markdown 文件到数据库的自动同步
- **混合架构支持**：为前端提供动态元数据补充

## 🏗️ 技术架构

### 核心技术栈

- **运行时**：Node.js + Express.js
- **数据库**：Prisma ORM + SQLite (开发) / PostgreSQL (生产)
- **认证**：JWT + bcryptjs 密码哈希
- **测试**：Jest + Supertest
- **开发工具**：tsx (TypeScript 执行) + ts-node-dev

### 分层架构

```
src/
├── controllers/        # 控制器层：处理 HTTP 请求响应
├── services/          # 服务层：业务逻辑实现
├── middlewares/       # 中间件：认证、错误处理等
├── routes/           # 路由层：API 端点定义
├── types/            # TypeScript 类型定义
└── utils/            # 工具函数：验证、数据库等
```

## 🗄️ 数据模型

### User (用户)

```typescript
{
  id: number          // 自增主键
  email: string       // 邮箱（唯一）
  name?: string       // 用户名（可选）
  password: string    // 哈希密码
  createdAt: DateTime // 创建时间
  updatedAt: DateTime // 更新时间
  posts: Post[]       // 关联文章
}
```

### Post (文章)

```typescript
{
  id: number          // 自增主键
  title: string       // 文章标题
  slug: string        // URL 友好标识（唯一）
  content: string     // Markdown 原文
  excerpt?: string    // 文章摘要（可选）
  published: boolean  // 发布状态
  createdAt: DateTime // 创建时间
  updatedAt: DateTime // 更新时间
  author: User        // 关联作者
  authorId: number    // 作者 ID
}
```

## 🔌 API 端点文档

### 🔐 认证相关

**基础路径**: `/api/auth`

#### POST `/api/auth/register` - 用户注册

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "用户姓名"
}
```

**响应 (200)**:

```json
{
  "message": "用户注册成功",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "用户姓名"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**错误响应 (400)**:

```json
{
  "error": "邮箱已被注册"
}
```

#### POST `/api/auth/login` - 用户登录

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**响应 (200)**:

```json
{
  "message": "登录成功",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "用户姓名"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET `/api/auth/profile` - 获取用户信息

**请求头**:

```
Authorization: Bearer <JWT_TOKEN>
```

**响应 (200)**:

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "用户姓名",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### 📝 文章管理

**基础路径**: `/api/posts`

#### GET `/api/posts` - 获取所有已发布文章

**查询参数**:

- `limit` (可选): 限制返回数量，默认 50
- `offset` (可选): 分页偏移，默认 0

**响应 (200)**:

```json
[
  {
    "id": 1,
    "title": "文章标题",
    "slug": "article-slug",
    "excerpt": "文章摘要...",
    "published": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "author": {
      "id": 1,
      "name": "作者名",
      "email": "author@example.com"
    }
  }
]
```

#### GET `/api/posts/{slug}` - 获取文章详情

**路径参数**:

- `slug`: 文章的 URL 标识，支持嵌套路径 (如 `unit/unit1`)

**响应 (200)**:

```json
{
  "id": 1,
  "title": "文章标题",
  "slug": "unit/unit1",
  "content": "# 标题\n\n文章的完整 Markdown 内容...",
  "excerpt": "文章摘要",
  "published": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:00.000Z",
  "author": {
    "id": 1,
    "name": "作者名",
    "email": "author@example.com"
  }
}
```

#### POST `/api/posts` - 创建文章 🔒

**请求头**:

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**请求体**:

```json
{
  "title": "新文章标题",
  "content": "# 标题\n\n文章内容...",
  "slug": "custom-slug",
  "excerpt": "文章摘要",
  "published": false
}
```

**响应 (201)**:

```json
{
  "message": "文章创建成功",
  "post": {
    "id": 2,
    "title": "新文章标题",
    "slug": "custom-slug",
    "published": false,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/api/posts/{slug}` - 更新文章 🔒

**请求头** 和 **请求体** 同创建文章

**响应 (200)**:

```json
{
  "message": "文章更新成功",
  "post": {
    "id": 2,
    "title": "更新后的标题",
    "slug": "updated-slug",
    "updatedAt": "2025-01-01T12:00:00.000Z"
  }
}
```

#### DELETE `/api/posts/{slug}` - 删除文章 🔒

**请求头**:

```
Authorization: Bearer <JWT_TOKEN>
```

**响应 (200)**:

```json
{
  "message": "文章删除成功"
}
```

#### GET `/api/posts/user/my-posts` - 获取当前用户的文章 🔒

**请求头**:

```
Authorization: Bearer <JWT_TOKEN>
```

**响应 (200)**:

```json
[
  {
    "id": 1,
    "title": "我的文章",
    "slug": "my-article",
    "published": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### 🩺 健康检查

#### GET `/api/health` - 服务状态检查

**响应 (200)**:

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## 🛠️ 开发指南

### 环境设置

```bash
# 进入 API 服务器目录
cd packages/api-server

# 安装依赖
pnpm install

# 设置环境变量
cp .env.example .env
```

**环境变量配置** (`.env`):

```env
# 数据库连接
DATABASE_URL="file:./prisma/dev.db"

# JWT 密钥
JWT_SECRET="your-super-secret-jwt-key"

# 服务器端口
PORT=3001
```

### 数据库操作

```bash
# 生成 Prisma 客户端
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# 数据库种子填充
pnpm db:seed

# 打开数据库管理界面
pnpm db:studio

# 重置数据库（开发环境）
pnpm db:reset
```

### 开发服务器

```bash
# 启动开发服务器（带热重载）
pnpm dev

# 或者手动构建 + 启动
pnpm build
pnpm start
```

服务器启动后访问：`http://localhost:3001`

### 文档同步系统

```bash
# 同步 Markdown 文件到数据库
pnpm db:sync
```

**同步脚本功能**：

- 扫描 `../docs-site/docs/**/*.md` 文件
- 解析 frontmatter 元数据
- 智能生成 slug（支持中文和嵌套路径）
- 使用 upsert 操作保证幂等性
- 自动创建或更新文章记录
- 保留数据库中的额外信息

**Frontmatter 示例**：

```yaml
---
title: "文章标题"
author: "author@example.com" # 会映射到数据库用户
date: "2025-01-01"
published: true
excerpt: "自定义摘要"
---
```

## 🧪 测试

### 运行测试套件

```bash
# 运行所有测试
pnpm test

# 监视模式运行测试
pnpm test:watch

# API 集成测试
pnpm test:api
```

### 测试结构

```
__tests__/
├── setup.ts              # 测试环境配置
├── api-simple.test.ts    # 基础 API 测试
└── api-integration.test.ts # 集成测试
```

### 手动 API 测试

使用提供的测试脚本：

```bash
# 运行完整的 API 测试流程
node test-api.js
```

该脚本会测试：

- 用户注册和登录
- JWT 认证
- 文章的 CRUD 操作
- 错误处理

## 🔒 安全特性

### 认证机制

- **密码哈希**：使用 bcryptjs 进行密码哈希
- **JWT 认证**：无状态的令牌认证
- **令牌验证**：中间件自动验证 API 访问权限

### 数据验证

- **Joi 验证**：请求数据的结构化验证
- **SQL 注入防护**：Prisma ORM 自动处理
- **CORS 配置**：跨域请求控制

### 错误处理

```typescript
// 统一错误响应格式
{
  "error": "错误描述",
  "details": "详细错误信息",
  "code": "ERROR_CODE"
}
```

## 📦 生产部署

### 构建应用

```bash
# TypeScript 编译
pnpm build

# 启动生产服务器
pnpm start
```

### 数据库迁移

生产环境使用 PostgreSQL：

```bash
# 设置生产数据库 URL
DATABASE_URL="postgresql://user:password@localhost:5432/vitepress_lite"

# 运行迁移
pnpm db:migrate

# 生成客户端
pnpm db:generate
```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --only=production
COPY dist/ ./dist/
COPY prisma/ ./prisma/
EXPOSE 3001
CMD ["pnpm", "start"]
```

## 🔧 配置选项

### 服务器配置

```typescript
// src/index.ts
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
```

### 数据库配置

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"        // 开发环境
  // provider = "postgresql" // 生产环境
  url      = env("DATABASE_URL")
}
```

## 🚀 扩展指南

### 添加新的 API 端点

1. **创建控制器**：在 `src/controllers/` 添加业务逻辑
2. **定义路由**：在 `src/routes/` 中注册端点
3. **添加验证**：使用 Joi 验证请求数据
4. **编写测试**：在 `__tests__/` 中添加测试用例

### 数据库模式修改

```bash
# 1. 修改 prisma/schema.prisma
# 2. 生成迁移文件
pnpm db:migrate

# 3. 更新客户端
pnpm db:generate
```

### 添加中间件

```typescript
// src/middlewares/example.ts
export const exampleMiddleware = (req, res, next) => {
  // 中间件逻辑
  next();
};

// 在路由中使用
authRoutes.use(exampleMiddleware);
```

---

## 🔗 相关资源

- **前端文档**：[../docs-site/README.md](../docs-site/README.md)
- **项目总览**：[../../README.md](../../README.md)
- **Prisma 文档**：https://www.prisma.io/docs/
- **Express.js 指南**：https://expressjs.com/
- **JWT 介绍**：https://jwt.io/introduction/
