# 🚀 VitePress Lite SEO预渲染方案

## 📋 方案概述

本方案通过预渲染技术为Vue SPA应用添加SEO支持，在保持SPA优秀用户体验的同时，确保搜索引擎能够正确索引内容。

## 🏗️ 技术架构

```
Markdown文件 -> Virtual Pages Plugin -> Vue Router -> 预渲染引擎 -> 静态HTML + SEO标签
```

### 核心组件

1. **路由收集器** (`scripts/collect-routes.js`)
   - 自动发现所有Markdown文件
   - 转换为预渲染路由列表
   - 提取页面元数据

2. **SEO管理器** (`src/composables/useSEO.ts`)
   - 动态设置页面标题、描述、关键词
   - 生成Open Graph和Twitter Card标签
   - 添加结构化数据(JSON-LD)

3. **预渲染引擎** (`scripts/prerender.js`)
   - 使用Puppeteer渲染真实DOM
   - 生成包含完整内容的静态HTML
   - 自动生成sitemap.xml

4. **SEO测试器** (`scripts/test-seo.js`)
   - 验证预渲染结果
   - 模拟搜索引擎爬虫
   - 生成SEO质量报告

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

新增的主要依赖：

- `@unhead/vue`: Vue 3的头部管理库
- `puppeteer`: 无头浏览器，用于预渲染
- `fs-extra`: 增强的文件操作库

### 2. 开发模式

```bash
npm run dev
```

开发时SEO组合式函数会自动工作，动态设置页面元信息。

### 3. 构建预渲染版本

```bash
# 完整构建流程
npm run build:prerender

# 或分步执行
npm run build          # 构建SPA版本
npm run prerender      # 执行预渲染
```

### 4. 预览预渲染结果

```bash
npm run preview:prerender
```

访问 http://localhost:4173 查看预渲染版本。

### 5. 测试SEO效果

```bash
npm run test:seo
```

## 📊 SEO优化特性

### ✅ 已实现

1. **动态Meta标签**
   - 页面标题 (`<title>`)
   - 描述 (`<meta name="description">`)
   - 关键词 (`<meta name="keywords">`)
   - 作者信息 (`<meta name="author">`)

2. **社交媒体标签**
   - Open Graph (Facebook等)
   - Twitter Card
   - 自动图片标签

3. **结构化数据**
   - JSON-LD格式
   - Article类型标记
   - 作者和发布信息

4. **技术SEO**
   - 语义化URL结构
   - Sitemap.xml自动生成
   - 移动端适配
   - 页面性能优化

### 🎯 SEO最佳实践

1. **Markdown文件头部配置**

```yaml
---
title: "页面标题(建议50-60字符)"
description: "页面描述(建议120-160字符)"
tags: ["关键词1", "关键词2", "关键词3"]
author: "作者名称"
date: "2025-01-27"
image: "/path/to/image.jpg"
---
```

2. **标题层级结构**

```markdown
# H1主标题 (每页只一个)

## H2章节标题

### H3小节标题
```

3. **内容优化**
   - 每页2000+字符的实质性内容
   - 合理的关键词密度(2-5%)
   - 内部链接建设

## 🔧 配置说明

### 路由收集配置

在 `scripts/collect-routes.js` 中配置：

```javascript
// 自定义路由过滤
const routes = pages
  .filter(page => !page.includes('draft'))  // 排除草稿
  .map(page => /* 路由转换逻辑 */);
```

### SEO元数据配置

在 `src/composables/useSEO.ts` 中自定义：

```typescript
// 默认SEO设置
const defaultMeta = {
  title: "VitePress Lite",
  description: "轻量级文档站点",
  keywords: "vite,vue,documentation",
};
```

### 预渲染配置

在 `scripts/prerender.js` 中调整：

```javascript
const prerender = new PrerenderEngine({
  baseUrl: "http://localhost:5173",
  outputDir: "dist-prerender",
  timeout: 30000, // 页面加载超时
  waitForSelector: "main", // 等待的选择器
});
```

## 📈 性能优化

### 构建优化

1. **代码分割**
   - Vue核心库单独打包
   - Markdown引擎独立分块
   - CSS合并优化

2. **资源优化**
   - 图片懒加载
   - 字体子集化
   - CSS压缩合并

### 预渲染优化

1. **并发渲染**
   - 支持多页面并行预渲染
   - 智能超时处理
   - 内存使用优化

2. **缓存策略**
   - 增量预渲染
   - 内容变更检测
   - 智能重建

## 🧪 测试与验证

### SEO测试工具

```bash
npm run test:seo
```

测试内容：

- HTML静态分析
- 爬虫模拟测试
- SEO质量评分
- 优化建议生成

### 手动验证方法

1. **查看源代码**

   ```bash
   curl http://localhost:4173/docs/setting | grep -E '<title>|<meta'
   ```

2. **使用在线工具**
   - [Google Rich Results Test](https://search.google.com/test/rich-results)
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)

3. **搜索引擎测试**
   ```
   site:yourdomain.com
   ```

## 🚀 部署建议

### 静态托管

推荐平台：

- **Netlify**: 自动构建 + CDN
- **Vercel**: 边缘网络优化
- **GitHub Pages**: 免费静态托管
- **Cloudflare Pages**: 全球CDN

### Nginx配置

```nginx
# SEO友好的URL重写
location / {
    try_files $uri $uri/index.html $uri.html =404;
}

# 启用压缩
gzip on;
gzip_types text/html text/css application/javascript application/json;

# 缓存策略
location ~* \.(css|js|png|jpg|jpeg|gif|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 监控与分析

### 搜索引擎收录

1. **Google Search Console**
   - 提交sitemap.xml
   - 监控索引状态
   - 分析搜索表现

2. **必应站长工具**
   - 验证站点所有权
   - 提交URL
   - 查看爬取统计

### 性能监控

```javascript
// Core Web Vitals 监控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🆘 故障排除

### 常见问题

1. **预渲染失败**
   - 检查端口占用
   - 确认依赖安装完整
   - 查看浏览器错误日志

2. **SEO标签不显示**
   - 验证@unhead/vue配置
   - 检查组合式函数调用
   - 确认路由元数据设置

3. **sitemap.xml不生成**
   - 检查路由收集逻辑
   - 验证文件写入权限
   - 确认输出目录存在

### 调试技巧

```bash
# 启用详细日志
DEBUG=true npm run prerender

# 测试单个页面
node -e "
const { PrerenderEngine } = require('./scripts/prerender.js');
const engine = new PrerenderEngine();
engine.renderRoute('/docs/setting').then(console.log);
"
```

## 🔄 迁移指南

### 从传统SPA迁移

1. 添加SEO依赖
2. 配置头部管理
3. 设置预渲染流程
4. 更新构建脚本
5. 验证SEO效果

### 升级现有实现

1. 对比新旧配置
2. 增量迁移功能
3. 测试兼容性
4. 优化性能表现

---

## 📞 技术支持

如有问题，请：

1. 查看本文档的故障排除部分
2. 运行 `npm run test:seo` 获取诊断信息
3. 提交Issue时附上SEO测试报告

**预期SEO改善效果：**

- 搜索引擎可索引性：从1/10提升到8/10
- 元信息完整性：从2/10提升到9/10
- 整体SEO评分：从3/10提升到8/10
