import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种数据库...');

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('123456', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: '测试用户',
      password: hashedPassword,
    },
  });

  console.log('👤 创建用户:', user.email);

  // 创建测试文章
  const posts = [
    {
      title: 'VitePress-Lite 项目介绍',
      content: `# VitePress-Lite 项目介绍

这是一个基于 Vue 3 + Vite 的轻量级文档站点生成器。

## 主要特性

- 🚀 快速的热模块更新
- 📝 Markdown 文件自动转换为 Vue 组件
- 🔄 自动路由生成
- 🎨 现代化的界面设计

## 技术栈

- Vue 3
- Vite
- TypeScript
- Node.js
- Express
- Prisma
- SQLite`,
      excerpt: '一个现代化的文档站点生成器，支持热更新和自动路由生成。',
      published: true,
    },
    {
      title: 'API 接口设计说明',
      content: `# API 接口设计说明

本项目采用 RESTful API 设计风格，提供完整的用户认证和文章管理功能。

## 认证接口

- POST /api/auth/register - 用户注册
- POST /api/auth/login - 用户登录
- GET /api/auth/profile - 获取用户信息

## 文章接口

- GET /api/posts - 获取文章列表
- GET /api/posts/:slug - 获取文章详情
- POST /api/posts - 创建文章
- PUT /api/posts/:slug - 更新文章
- DELETE /api/posts/:slug - 删除文章`,
      excerpt: 'RESTful API 设计说明，包含完整的用户认证和文章管理功能。',
      published: true,
    },
    {
      title: '开发环境配置指南',
      content: `# 开发环境配置指南

## 环境要求

- Node.js >= 22
- pnpm >= 7

## 安装步骤

1. 克隆项目
2. 安装依赖: \`pnpm install\`
3. 配置环境变量
4. 运行数据库迁移: \`pnpm db:migrate\`
5. 启动开发服务器: \`pnpm dev\`

## 项目结构

- packages/docs-site - 前端文档站点
- packages/api-server - 后端 API 服务`,
      excerpt: '详细的开发环境配置指南，包含所有必要的安装和配置步骤。',
      published: false,
    }
  ];

  for (const postData of posts) {
    const slug = postData.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-|-$/g, '');

    const post = await prisma.post.upsert({
      where: { slug },
      update: {},
      create: {
        ...postData,
        slug,
        authorId: user.id,
      },
    });

    console.log('📝 创建文章:', post.title);
  }

  console.log('✅ 数据库播种完成！');
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 