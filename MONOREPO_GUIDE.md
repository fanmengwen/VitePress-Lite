# VitePress-Lite Monorepo 使用指南

## 📁 项目结构

```
VitePress-Lite/
├── packages/
│   ├── api-server/     # 后端 API 服务
│   └── docs-site/      # 前端文档站点
├── package.json        # 根目录 - monorepo 管理
└── pnpm-workspace.yaml # pnpm 工作区配置
```

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 一键启动开发环境

```bash
pnpm dev
```

这将同时启动前端和后端开发服务器：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

### 单独启动某个服务

```bash
# 仅启动前端
pnpm dev:docs

# 仅启动后端
pnpm dev:api
```

## 🔧 开发命令

### 开发环境

| 命令            | 功能         | 说明                     |
| --------------- | ------------ | ------------------------ |
| `pnpm dev`      | 启动所有服务 | 并行启动前后端开发服务器 |
| `pnpm dev:docs` | 启动前端     | 仅启动文档站点           |
| `pnpm dev:api`  | 启动后端     | 仅启动 API 服务器        |

### 构建部署

| 命令                    | 功能         | 说明                       |
| ----------------------- | ------------ | -------------------------- |
| `pnpm build`            | 构建所有项目 | 生成生产环境代码           |
| `pnpm build:docs`       | 构建前端     | 生成静态文件到 `dist/`     |
| `pnpm build:api`        | 构建后端     | 编译 TypeScript 到 `dist/` |
| `pnpm preview`          | 预览前端     | 本地预览构建后的前端       |
| `pnpm start:production` | 生产环境启动 | 构建并启动完整应用         |

### 测试命令

| 命令                        | 功能         | 说明                   |
| --------------------------- | ------------ | ---------------------- |
| `pnpm test`                 | 运行所有测试 | 执行前后端测试套件     |
| `pnpm test:api`             | 后端单元测试 | 运行 Jest 测试         |
| `pnpm test:api-integration` | 后端集成测试 | 运行 API 集成测试      |
| `pnpm test:watch`           | 监视测试     | 文件变更时自动运行测试 |

## 🗄️ 数据库管理

| 命令               | 功能           | 说明                         |
| ------------------ | -------------- | ---------------------------- |
| `pnpm db:migrate`  | 数据库迁移     | 应用新的数据库架构           |
| `pnpm db:generate` | 生成客户端     | 更新 Prisma 客户端           |
| `pnpm db:studio`   | 数据库管理界面 | 打开 Prisma Studio           |
| `pnpm db:seed`     | 填充测试数据   | 添加初始数据                 |
| `pnpm db:sync`     | 同步文档数据   | 将 Markdown 文件同步到数据库 |
| `pnpm db:reset`    | 重置数据库     | 重新迁移并填充数据           |

## 🛠️ 维护命令

| 命令                 | 功能         | 说明                     |
| -------------------- | ------------ | ------------------------ |
| `pnpm clean`         | 清理构建文件 | 删除 `dist/` 和缓存      |
| `pnpm format`        | 代码格式化   | 使用 Prettier 格式化代码 |
| `pnpm lint`          | 代码检查     | 运行 ESLint 检查         |
| `pnpm type-check`    | 类型检查     | TypeScript 类型验证      |
| `pnpm deps:update`   | 更新依赖     | 更新所有包的依赖         |
| `pnpm deps:outdated` | 检查过期依赖 | 查看可更新的依赖         |

## 📝 开发工作流

### 日常开发

1. **启动开发环境**

   ```bash
   pnpm dev
   ```

2. **数据库初始化**（首次开发）

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

3. **代码开发**
   - 前端代码：`packages/docs-site/src/`
   - 后端代码：`packages/api-server/src/`

4. **测试验证**
   ```bash
   pnpm test
   ```

### 功能发布

1. **代码检查**

   ```bash
   pnpm lint
   pnpm type-check
   ```

2. **构建验证**

   ```bash
   pnpm build
   ```

3. **生产环境测试**
   ```bash
   pnpm start:production
   ```

## 🏗️ Monorepo 架构优势

### 1. 统一依赖管理

- **依赖提升**：公共依赖安装在根目录，节省磁盘空间
- **版本一致性**：确保相同依赖在不同包中版本一致
- **符号链接**：通过软链接共享依赖，提高安装速度

### 2. 高效的脚本编排

- **并行执行**：`--parallel` 标志同时运行多个任务
- **选择性执行**：`--filter` 标志针对特定包执行命令
- **依赖感知**：自动处理包之间的依赖关系

### 3. 开发体验优化

- **一键启动**：单个命令启动完整开发环境
- **统一接口**：所有操作都在根目录进行
- **智能路由**：命令自动路由到正确的子包

## 🔧 自定义扩展

### 添加新的子包

1. 在 `packages/` 下创建新目录
2. 添加 `package.json` 配置
3. 确保包含标准脚本：`dev`、`build`、`test`
4. 根目录脚本会自动发现并包含新包

### 添加新的脚本

在根目录 `package.json` 中添加：

```json
{
  "scripts": {
    "my-command": "pnpm --filter package-name my-script"
  }
}
```

## 🚨 常见问题

### 依赖安装问题

```bash
# 清理并重新安装
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 数据库连接问题

```bash
# 重置数据库
pnpm db:reset
```

### 端口配置

- 前端开发服务器：5173
- 后端 API 服务器：3001
- 前端通过代理 `/api` 访问后端服务
- 可在各自的环境变量中修改

## 📚 技术栈

- **包管理器**：pnpm + workspace
- **前端**：Vue 3 + TypeScript + Vite
- **后端**：Node.js + Express + TypeScript
- **数据库**：SQLite + Prisma ORM
- **测试**：Jest + Supertest
