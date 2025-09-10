---
title: 【Vite Rolldown 集成指南】
date: 2025-09-10
author: meng
published: true
tags: ["Vite", "Rolldown"]
excerpt: "Rolldown 集成指南"
---

# Vite Rolldown 集成指南

以下内容基于 Vite 官方文档的 Rolldown 集成部分（https://cn.vite.dev/guide/rolldown.html），整理为 Markdown 格式，涵盖 Rolldown 的介绍、集成方法、性能优化、已知限制及未来计划。

## Rolldown 是什么？

Rolldown 是一个由 Rust 编写的现代化、高性能 JavaScript 打包工具，设计为 Rollup 的替代品，保持与现有生态系统兼容的同时显著提升性能。其核心原则包括：

- **速度**：利用 Rust 的高性能进行快速构建。
- **兼容性**：支持现有的 Rollup 插件。
- **优化**：提供比 esbuild 和 Rollup 更高级的特性，如高级分块控制、内置模块热替换（HMR）和模块联邦（Module Federation）。

欲了解更多设计动机，请参阅 [构建 Rolldown 的原因](https://rolldown.rs/motivation.html)。

## 为什么 Vite 要迁移到 Rolldown？

Vite 当前使用 esbuild 进行依赖预打包，使用 Rollup 进行生产构建。迁移到 Rolldown 的原因包括：

1. **统一**：Rolldown 将预打包和生产构建统一到一个高性能工具，降低复杂性。
2. **性能**：Rust 实现的 Rolldown 比基于 JavaScript 的打包工具更快，早期测试显示其速度优于 Rollup。
3. **额外特性**：提供 Rollup 和 esbuild 缺乏的功能，如高级分块控制、HMR 和模块联邦。

## 尝试 `rolldown-vite` 的好处

- **提升构建速度**：尤其对大型项目效果显著。
- **参与开发**：通过反馈帮助塑造 Vite 的未来打包体验。
- **为官方集成做准备**：提前适应 Rolldown 的功能。

## 如何尝试 Rolldown

基于 Rolldown 的 Vite 目前以 `rolldown-vite` 包提供，可通过在 `package.json` 中设置别名替换 `vite` 包：

```json
{
  "dependencies": {
    "vite": "^7.0.0",
    "vite": "npm:rolldown-vite@latest"
  }
}
```

对于使用 Vite 作为同等依赖的框架（如 VitePress），需要通过包管理器的 `overrides` 或 `resolutions` 配置覆盖 `vite`：

```json
{
  "overrides": {
    "vite": "npm:rolldown-vite@latest"
  }
}
```

```json
{
  "resolutions": {
    "vite": "npm:rolldown-vite@latest"
  }
}
```

```json
{
  "pnpm": {
    "overrides": {
      "vite": "npm:rolldown-vite@latest"
    }
  }
}
```

安装依赖后，无需额外配置即可正常启动开发服务器或构建项目。

## 已知限制

Rolldown 虽旨在替代 Rollup，但部分特性仍在开发中，存在一些行为差异。详情请参考 [GitHub PR](https://github.com/rolldown/rolldown/pulls)。

### 验证选项警告

Rolldown 对未知或无效选项会发出警告。例如：

```
Warning validate output options.
* For the "generatedCode". Invalid key: Expected never but received "generatedCode".
```

此问题通常由框架或插件传递了 Rolldown 不支持的 Rollup 选项引起，需由框架开发者解决。

### API 差异

#### `manualChunks` 改为 `advancedChunks`

`manualChunks` 已被标记为过时，推荐使用 `advancedChunks`，其功能类似 Webpack 的 `splitChunk`：

```javascript
// 旧配置 (Rollup)
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/\/react(?:-dom)?/.test(id)) {
            return 'vendor';
          }
        }
      }
    }
  }
}

// 新配置 (Rolldown)
export default {
  build: {
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [{ name: 'vendor', test: /\/react(?:-dom)?/ }]
        }
      }
    }
  }
}
```

## 性能优化

`rolldown-vite` 默认配置优先兼容性，性能可通过以下方式进一步提升：

### 启用原生插件

Vite 的内部插件（如 alias、resolve）已转换为 Rust，默认启用（`experimental.enableNativePlugin` 设为 `'v1'`）。若遇问题，可设置为 `'resolver'` 或 `false`，但此选项未来将被移除。

### 使用 Oxc 的 React 刷新转换

`@vitejs/plugin-react`（v5.0.0+）使用 Oxc 进行 React 刷新转换，若不使用 Babel 插件，转换过程完全由 Oxc 完成，提升性能。推荐从 `@vitejs/plugin-react-swc` 切换到 `@vitejs/plugin-react`，无需额外配置。

> **注意**：`@vitejs/plugin-react-oxc` 已弃用，其功能已合并至 `@vitejs/plugin-react`。

### `withFilter` 包装器

插件作者可使用 `withFilter` 包装器为插件添加过滤条件，减少 Rust 和 JavaScript 运行时通信开销：

```javascript
import { withFilter, defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [
    withFilter(
      svgr({
        /*...*/
      }),
      { load: { id: /\.svg\?react$/ } }
    ),
  ],
});
```

## 反馈问题

如遇问题，请在 [vitejs/rolldown-vite](https://github.com/vitejs/rolldown-vite) 仓库提交 issue，并提供：

- 最小复现代码
- 环境信息（操作系统、Node 版本、包管理器）
- 相关错误日志

实时讨论可加入 [Rolldown Discord](https://discord.com/invite/rolldown)。

## 版本管理策略

`rolldown-vite` 的主版本号和次版本号与 Vite 保持一致，但补丁版本独立。由于实验性质，补丁版本可能引入破坏性变更，且仅为最新次版本提供更新。查看 [更新日志](https://github.com/vitejs/rolldown-vite/blob/main/CHANGELOG.md) 以确认具体变更。

## 未来计划

`rolldown-vite` 是临时解决方案，未来将合并至主 Vite 仓库。Vite 计划引入**全量打包模式（Full Bundle Mode）**，在开发和生产环境中提供打包后的文件，解决以下问题：

- **开发/生产不一致**：消除运行时行为差异，减少生产环境调试难度。
- **开发性能瓶颈**：减少模块请求的网络开销，提升大型应用的启动和刷新速度。

全量打包模式将：

- 保持快速启动
- 确保开发与生产一致性
- 降低页面刷新网络开销
- 维持高效 HMR

该模式初期为可选特性，稳定后计划设为默认。

## 插件/框架作者指南

> **提示**：本节针对插件和框架开发者，一般用户可忽略。

### 主要变更

- **构建**：使用 Rolldown（替代 Rollup）。
- **优化器**：使用 Rolldown（替代 esbuild）。
- **CommonJS 支持**：由 Rolldown 处理（替代 `@rollup/plugin-commonjs`）。
- **语法降级**：使用 Oxc（替代 esbuild）。
- **CSS 压缩**：默认使用 Lightning CSS（替代 esbuild）。
- **JS 压缩**：默认使用 Oxc minifier（替代 esbuild）。
- **打包配置**：使用 Rolldown（替代 esbuild）。

### 检测 `rolldown-vite`

通常无需区分 `rolldown-vite` 和 `vite`，但如需特殊处理，可通过以下方式检测：

1. 检查 `this.meta.rolldownVersion`：

```javascript
const plugin = {
  resolveId() {
    if (this.meta.rolldownVersion) {
      // rolldown-vite 逻辑
    } else {
      // vite 逻辑
    }
  },
};
```

> **提示**：自 Vite 7.0.0 起，`this.meta` 在所有钩子中可用。

2. 检查 `rolldownVersion` 导出：

```javascript
import * as vite from "vite";

if (vite.rolldownVersion) {
  // rolldown-vite 逻辑
} else {
  // vite 逻辑
}
```

### 忽略选项验证

通过条件式传递选项避免 Rolldown 的警告（参考“验证选项警告”部分）。

### `transformWithEsbuild` 变更

由于 Vite 不再依赖 esbuild，需单独安装 `esbuild` 或使用 `transformWithOxc`：

```javascript
import { transformWithOxc } from "vite";

const plugin = {
  async transform(code, id) {
    if (id.endsWith(".jsx")) {
      const result = await transformWithOxc(code, id);
      return result;
    }
  },
};
```

### `esbuild` 选项兼容层

Rolldown-Vite 提供 `esbuild` 选项到 Oxc/Rolldown 的兼容层，但未来将移除支持。插件作者可从 `configResolved` 钩子获取兼容层选项：

```javascript
const plugin = {
  name: "log-config",
  configResolved(config) {
    console.log("options", config.optimizeDeps, config.oxc);
  },
};
```

### 钩子过滤功能

Rolldown 支持钩子过滤以提升性能，Vite 6.3.0+ 和 Rollup 4.38.0+ 也支持。使用 `@rolldown/pluginutils` 的工具函数（如 `exactRegex`、`prefixRegex`）确保向后兼容：

```javascript
import { exactRegex } from "@rolldown/pluginutils";

const plugin = {
  load(id) {
    if (exactRegex(/\.svg$/).test(id)) {
      // 处理逻辑
    }
  },
};
```

### 将内容转换为 JavaScript

在 `load` 或 `transform` 钩子中返回 JavaScript 内容时，需指定 `moduleType: 'js'`：

```javascript
const plugin = {
  name: "txt-loader",
  load(id) {
    if (id.endsWith(".txt")) {
      const content = fs.readFile(id, "utf-8");
      return {
        code: `export default ${JSON.stringify(content)}`,
        moduleType: "js",
      };
    }
  },
};
```

## 总结

Rolldown 集成将为 Vite 带来更快的构建速度和更丰富的功能。通过 `rolldown-vite` 包，开发者可提前体验并提供反馈。未来，全量打包模式将进一步统一开发与生产体验。更多详情请参考 [Vite 官方文档](https://cn.vite.dev) 和 [Rolldown 仓库](https://github.com/rolldown/rolldown)。
