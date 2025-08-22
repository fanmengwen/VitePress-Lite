---
title: "【HMR 热更新原理】"
author: "mengwen"
date: "2025-01-01"
published: true
excerpt: "HMR 热更新原理"
---

# 🔥 Vite 的 HMR（热模块替换）机制介绍

Vite 是一个现代前端构建工具，因其极快的冷启动和高效的开发体验而受到广泛欢迎。其中一个重要特性就是 **HMR（Hot Module Replacement）**，即“热模块替换”。

---

## 📌 什么是 HMR？

HMR 是一种前端开发机制，在不刷新整个页面的情况下，只替换变更的模块，并自动更新页面中对应部分。这种方式大大提升了开发效率，尤其在 React、Vue 等响应式框架中，能做到“状态保留”的即时反馈。

---

## ⚙️ Vite 中的 HMR 工作原理

### 1. 文件监听

Vite 使用原生的文件系统监听器（如 chokidar）监听项目中文件的变化。

### 2. WebSocket 通信

一旦文件变化，Vite 会通过 WebSocket 向浏览器推送变更信息：

```bash
[src/components/Button.vue] has changed, sending HMR update...
```
