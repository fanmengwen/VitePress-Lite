---
title: "【VitePress Lite SEO 优化指南】"
description: "了解如何使用 VitePress Lite 的 SEO 功能来提升您网站的搜索引擎排名和可见性"
keywords: "SEO,搜索引擎优化,VitePress,站点地图,robots.txt,meta标签"
author: "VitePress Lite Team"
date: "2025-08-15"
category: "文档"
tags: ["SEO", "优化", "搜索引擎"]
image: "/og-image.jpg"
type: "article"
published: true
---

# VitePress Lite SEO 优化指南

本指南将帮助您充分利用 VitePress Lite 的 SEO 功能，提升网站在搜索引擎中的排名。

## 🚀 功能概览

VitePress Lite 提供了全面的 SEO 优化功能：

### ✅ 已实现的功能

1. **自动站点地图生成** - 基于路由自动生成 `sitemap.xml`
2. **智能 robots.txt** - 配置搜索引擎爬虫规则
3. **动态 Meta 标签** - 基于内容自动生成 SEO 标签
4. **Open Graph 支持** - 社交媒体分享优化
5. **JSON-LD 结构化数据** - 增强搜索结果显示
6. **移动端优化** - PWA 和移动设备适配

## 📝 Markdown 文件配置

在您的 Markdown 文件顶部添加 frontmatter 来配置 SEO：

```yaml
---
title: "页面标题（50-60字符最佳）"
description: "页面描述（120-160字符最佳）"
keywords: "关键词1,关键词2,关键词3"
author: "作者名称"
date: "2025-08-15"
category: "分类名称"
tags: ["标签1", "标签2", "标签3"]
image: "/path/to/social-image.jpg"
type: "article" # 或 "website"
---
```

## 🗺️ 站点地图配置

### 自动生成

构建时自动生成站点地图：

```bash
npm run build:prerender  # 预渲染并生成站点地图
npm run generate:sitemap # 仅生成站点地图
```

### 配置选项

在 `seo.config.js` 中自定义：

```javascript
export default {
  site: {
    url: "https://your-domain.com", // 👈 必须配置您的域名
  },
  sitemap: {
    changefreq: "weekly",
    priority: {
      home: "1.0",
      docs: "0.8",
      pages: "0.6",
    },
  },
};
```

## 🤖 robots.txt 配置

自动生成的 `robots.txt` 包含：

- ✅ 允许所有搜索引擎访问
- 🚫 禁止访问敏感目录
- 📍 指向站点地图位置
- ⏱️ 设置爬取延迟

## 📊 SEO 最佳实践

### 1. 标题优化

- 使用唯一、描述性的标题
- 长度控制在 50-60 字符
- 包含主要关键词

### 2. 描述优化

- 编写吸引人的描述
- 长度控制在 120-160 字符
- 自然融入关键词

### 3. 内容结构

```markdown
# H1 主标题（每页只一个）

## H2 章节标题

### H3 小节标题

正文内容应该实质性、有价值，推荐每页 2000+ 字符。
```

### 4. 图片优化

- 使用 alt 属性描述图片
- 针对社交分享使用 1200x630 尺寸的 OG 图片
- 优化图片文件大小

## 🧪 测试与验证

### 1. 本地测试

```bash
npm run test:seo       # 快速 SEO 测试
npm run test:seo:full  # 完整 SEO 分析
```

### 2. 在线工具验证

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### 3. 搜索引擎提交

```bash
# 查看生成的站点地图
curl https://your-domain.com/sitemap.xml

# 检查 robots.txt
curl https://your-domain.com/robots.txt
```

## ⚙️ 高级配置

### 自定义 JSON-LD

在组件中使用：

```vue
<script setup>
import { useSEO } from "@/composables/useSEO";

const seoData = {
  title: "自定义页面标题",
  description: "页面描述",
  type: "website", // 或 'article'
  // ... 其他配置
};

useSEO(seoData);
</script>
```

### 动态计算阅读时间

```javascript
import { calculateReadingTime, calculateWordCount } from "@/composables/useSEO";

const content = "您的文章内容...";
const readingTime = calculateReadingTime(content); // 分钟
const wordCount = calculateWordCount(content); // 字数
```

## 📈 性能监控

### Core Web Vitals

添加性能监控：

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

// 监控关键性能指标
getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🚀 部署建议

### 1. 静态托管平台

- **推荐：** Netlify, Vercel, Cloudflare Pages
- **优势：** 自动 HTTPS, 全球 CDN, 边缘计算

### 2. 服务器配置

Nginx 示例：

```nginx
# SEO 友好的 URL 重写
location / {
    try_files $uri $uri/index.html $uri.html =404;
}

# 压缩优化
gzip on;
gzip_types text/html text/css application/javascript;

# 缓存策略
location ~* \.(css|js|png|jpg|jpeg|gif|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📋 SEO 检查清单

构建前请确认：

- [ ] 配置了正确的域名（`seo.config.js`）
- [ ] 每个页面都有唯一的标题和描述
- [ ] 图片添加了 alt 属性
- [ ] 内容结构合理（H1-H6 层级）
- [ ] 生成了站点地图和 robots.txt
- [ ] 测试了移动端适配
- [ ] 验证了社交分享卡片

## 🆘 常见问题

### Q: 站点地图不更新？

A: 清理构建缓存并重新生成：

```bash
npm run clean
npm run build:prerender
```

### Q: Meta 标签不显示？

A: 检查 @unhead/vue 配置和组合式函数调用。

### Q: 社交分享图片不显示？

A: 确保图片路径正确，尺寸为 1200x630，文件大小 < 8MB。

---

## 💡 下一步

- 配置 Google Search Console
- 设置 Google Analytics
- 监控 Core Web Vitals
- 定期检查 SEO 表现

通过以上配置，您的 VitePress Lite 站点将具备完善的 SEO 功能，帮助提升搜索引擎排名和用户体验！
