# 🚀 VitePress-Lite 生产环境部署指南

## 📖 概述

VitePress-Lite 是一个包含三个核心服务的 monorepo 项目：

- **📄 docs-site**: Vue.js 前端文档站点
- **⚡ api-server**: Node.js Express API 服务器
- **🤖 ai-service**: Python FastAPI AI 服务

## 🎯 部署方案

### 方案一：Docker 容器化部署（推荐）

#### 1. 准备环境变量

```bash
# 复制环境变量模板
cp production.env.example .env

# 编辑环境变量（必须配置 OPENAI_API_KEY 和 JWT_SECRET）
nano .env
```

#### 2. 构建和启动所有服务

```bash
# 构建 Docker 镜像
pnpm docker:build

# 启动所有服务（后台运行）
pnpm docker:up

# 查看服务日志
pnpm docker:logs

# 停止所有服务
pnpm docker:down
```

#### 3. 服务访问地址

- **前端文档站点**: http://localhost:4173
- **API 服务器**: http://localhost:3001
- **AI 服务**: http://localhost:8000
- **数据库管理**: http://localhost:8080 (Adminer)

#### 4. 健康检查

```bash
# 检查所有服务状态
docker-compose -f docker-compose.production.yml ps

# 检查特定服务日志
docker-compose -f docker-compose.production.yml logs -f docs-site
docker-compose -f docker-compose.production.yml logs -f api-server
docker-compose -f docker-compose.production.yml logs -f ai-service
```

### 方案二：直接命令行运行

#### 1. 安装依赖

```bash
# 安装所有依赖
pnpm install

# 安装 Python AI 服务依赖
cd packages/ai-service
poetry install
cd ../..
```

#### 2. 构建项目

```bash
pnpm build
```

#### 3. 启动数据库（使用 Docker）

```bash
cd packages/api-server
pnpm docker:up
cd ../..
```

#### 4. 启动所有服务

```bash
# 方式一：使用 concurrently 并行启动（推荐）
pnpm start:production

# 方式二：手动分别启动各服务
# 终端 1: API 服务器
pnpm --filter api-server start

# 终端 2: 前端站点
pnpm --filter docs-site preview

# 终端 3: AI 服务
cd packages/ai-service && python src/main.py
```

## ⚙️ 配置说明

### 必须配置的环境变量

1. **OPENAI_API_KEY**: OpenAI API 密钥（AI 服务必需）
2. **JWT_SECRET**: JWT 签名密钥（至少 32 字符）
3. **DATABASE_URL**: 数据库连接字符串

### 可选配置

- **CORS_ORIGIN**: 允许的跨域来源
- **LOG_LEVEL**: 日志级别 (debug, info, warn, error)
- **RATE_LIMIT_MAX_REQUESTS**: API 速率限制

## 🔧 维护命令

### Docker 方式

```bash
# 重启所有服务
pnpm docker:restart

# 查看服务状态
docker-compose -f docker-compose.production.yml ps

# 进入容器进行调试
docker exec -it vitepress-lite-api sh
docker exec -it vitepress-lite-ai sh
docker exec -it vitepress-lite-docs sh

# 清理资源
docker-compose -f docker-compose.production.yml down -v
docker system prune -a
```

### 直接运行方式

```bash
# 重新构建
pnpm build

# 清理缓存
pnpm clean

# 数据库操作
pnpm db:migrate
pnpm db:seed
pnpm db:reset

# AI 服务数据导入
pnpm ai:ingest
pnpm ai:ingest-clear
```

## 🛡️ 安全建议

1. **更改默认密码**: 修改 PostgreSQL 和 JWT 密钥
2. **使用 HTTPS**: 配置 SSL 证书
3. **防火墙设置**: 只开放必要端口
4. **定期备份**: 备份数据库和 AI 向量数据
5. **监控日志**: 定期检查应用日志

## 📊 性能优化

1. **资源限制**: 在 docker-compose.yml 中设置内存和 CPU 限制
2. **缓存配置**: 配置 Redis 缓存（可选）
3. **负载均衡**: 使用 nginx 进行负载均衡
4. **数据库优化**: 配置 PostgreSQL 性能参数

## 🐛 故障排除

### 常见问题

1. **端口冲突**: 修改 docker-compose.yml 中的端口映射
2. **内存不足**: 增加 Docker 内存限制
3. **数据库连接失败**: 检查 DATABASE_URL 配置
4. **AI 服务启动失败**: 确认 OPENAI_API_KEY 正确配置

### 日志查看

```bash
# Docker 方式
pnpm docker:logs

# 直接运行方式
# 查看各服务的控制台输出
```

## 🚀 高级部署

### 使用 nginx 反向代理

参考 `docker-compose.production.yml` 中的 nginx 配置，可以：

- 统一访问入口
- SSL 终止
- 负载均衡
- 静态文件缓存

### CI/CD 集成

推荐在 GitHub Actions 或其他 CI/CD 工具中使用 Docker 方式进行自动化部署。

---

🎉 **部署完成后，访问 http://localhost:4173 即可使用你的 VitePress-Lite 文档站点！**
