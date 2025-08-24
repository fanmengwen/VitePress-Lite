---
title: "Markdown 格式测试"
author: "测试"
date: "2025-01-01"
published: true
---

# Markdown 格式测试文档

这是一个用于测试 Markdown 解析器的文档。

## 代码块测试

### TypeScript 代码块

```typescript
const modules = import.meta.glob("./pages/*.vue", { eager: true }); // 默认 eager: false，懒加载
```

### JavaScript 代码块

```javascript
import.meta.glob 是 Vite 的一个元信息对象，它可以用来动态导入项目中的所有匹配指定模式的文件。

const modules = import.meta.glob("./pages/*.vue", { eager: true }); // 默认 eager: false，懒加载
```

## 行内代码测试

这里有一些行内代码：`import.meta.glob`、`{ eager: true }`、`Vue.js`。

## 列表测试

### 无序列表

- 第一项
- 第二项
- 第三项

### 有序列表

1. 第一步
2. 第二步
3. 第三步

## 强调测试

**粗体文本** 和 _斜体文本_

## 引用测试

> 这是一个引用块
> 可以包含多行内容

## 链接测试

[Vue.js 官网](https://vuejs.org) 和 [Vite 文档](https://vitejs.dev)
