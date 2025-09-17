---
title: 【Vite 资产处理指南】
date: "2025-09-10"
author: "mengwen"
published: true
tags: ["Vite", "Assets"]
excerpt: "资产处理指南"
---

# Vite 资产处理指南

以下内容基于 Vite 官方文档的资产处理部分（https://cn.vite.dev/guide/assets.html），整理为 Markdown 格式，涵盖静态资产的导入、URL 处理及相关配置。

## 概述

Vite 提供内置支持，用于处理静态资产（如图片、字体、音频等）。这些资产可以作为模块导入到 JavaScript 中，或者通过 URL 引用。Vite 在开发和生产环境中对资产的处理方式有所不同，确保开发效率和生产环境的优化。

## 导入静态资产

在 Vite 项目中，静态资产可以通过 `import` 语句作为模块导入。支持的资产类型包括但不限于：

- 图片（`.png`、`.jpg`、`.svg` 等）
- 字体（`.woff`、`.woff2`、`.ttf` 等）
- 媒体文件（`.mp4`、`.webm`、`.mp3` 等）

### 示例代码

```javascript
import img from "./image.png"; // 导入图片
```

- **开发环境**：Vite 会返回解析后的公共 URL（通常指向开发服务器）。
- **生产环境**：Vite 会将资产复制到 `dist` 目录，并生成带有哈希的文件名（如 `image.123abc.png`），以优化缓存。

导入后，`img` 变量的值是一个解析后的 URL，可以直接用于 `<img>` 标签或 CSS：

```html
<img :src="img" alt="example image" />
```

## `public` 目录

Vite 项目中的 `public` 目录用于存放无需处理、直接复制到输出目录的静态资产。放置在 `public` 目录中的文件：

- 不会被 Vite 的构建工具处理。
- 在开发环境中通过 `/` 根路径访问。
- 在生产环境中会被直接复制到 `dist` 根目录。

### 示例

将 `favicon.ico` 放入 `public` 目录，可以通过以下方式访问：

```html
<link rel="icon" href="/favicon.ico" />
```

**注意**：`public` 目录中的文件不会被哈希，适合不常变更的资产。

## 资产 URL 处理

Vite 支持在 JavaScript、CSS 和 HTML 中通过相对路径或绝对路径引用静态资产。Vite 会自动解析这些路径，确保在开发和生产环境中都能正确工作。

### 在 CSS 中引用

```css
.background {
  background-image: url("./image.png");
}
```

Vite 会将 `./image.png` 解析为正确的路径，并确保生产环境中生成的文件包含哈希。

### 动态 URL

如果需要动态引用资产，可以使用模板字符串结合导入的资产：

```javascript
import img from "./image.png";

function setImage(imageName) {
  return new URL(`./${imageName}`, import.meta.url).href;
}
```

`import.meta.url` 提供当前模块的 URL，适合动态构建资产路径。

## 构建时的资产优化

在生产构建中，Vite 会对静态资产进行以下优化：

1. **文件名哈希**：为资产添加哈希（如 `image.123abc.png`），以便长期缓存。
2. **分片（Chunking）**：小型资产可能被内联为 base64 编码的 Data URL，以减少 HTTP 请求。
3. **自动复制**：将引用的资产复制到 `dist/assets` 目录。

### 配置内联阈值

可以通过 `build.assetsInlineLimit` 配置内联资产的大小阈值（单位：字节）。默认值是 4096（4KB）。

```javascript
// vite.config.js
export default {
  build: {
    assetsInlineLimit: 8192, // 将阈值调整为 8KB
  },
};
```

若资产大小低于阈值，Vite 会将其内联为 base64；否则，生成单独的文件。

## 自定义资产路径

可以通过 `base` 配置项自定义资产的公共路径：

```javascript
// vite.config.js
export default {
  base: "/my-app/", // 设置基础路径
};
```

这会影响生产环境中资产的 URL 前缀，例如 `/my-app/assets/image.123abc.png`。

## 处理 SVG 资产

SVG 文件可以作为模块导入，也可以通过 `?url` 或 `?raw` 查询参数进行特殊处理：

- **默认导入**：作为模块导入，返回解析后的 URL。
- **`?url`**：强制返回资产的 URL，而不内联。
- **`?raw`**：将 SVG 文件内容作为字符串导入。

### 示例

```javascript
import svgUrl from "./icon.svg?url"; // 获取 URL
import svgContent from "./icon.svg?raw"; // 获取原始 SVG 内容
```

## 常见问题

1. **为什么资产在生产环境中路径不同？**  
   Vite 在生产环境中会对资产进行哈希和路径优化，确保缓存和加载效率。检查 `dist` 目录中的输出文件，确保引用路径正确。

2. **如何处理大型资产？**  
   将大型资产放入 `public` 目录，或调整 `assetsInlineLimit` 以避免内联。

3. **如何支持新资产类型？**  
   可通过 Vite 插件扩展支持。例如，使用 `vite-plugin-wasm` 处理 `.wasm` 文件。

## 总结

Vite 的资产处理机制简单而强大，支持模块化导入、URL 解析和生产环境优化。通过合理使用 `public` 目录和配置选项，可以满足各种静态资产管理需求。更多细节请参考 [Vite 官方文档](https://cn.vite.dev)。
