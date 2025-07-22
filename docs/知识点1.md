## 模块一：核心理念与快速上手

### 1.1 核心理念

Vite 是一种新型前端构建工具，它旨在提供一个更快、更精简的开发体验。它由一个本地开发服务器和一个生产构建命令组成

🔍「原理」: Vite 的独特性在于它如何利用现代浏览器。开发时（利用 esbuild），它利用浏览器原生的 ES Modules (ESM) 支持来提供源码，实现即时启动。生产构建时，它使用 Rollup 将代码打包成高效的静态资源。

### 1.2 为什么打包工具需要/依赖 ESM？

🔹 1. 静态结构特性  
ESM 是 静态分析友好 的模块系统：

```javascript
import { add } from "./math.js";
```

这意味着打包工具可以在编译阶段就知道你导入了哪些东西，有助于：

- Tree-shaking（删除未用代码）
- 按需打包（code splitting）
- 更快的构建性能

相比之下，CommonJS 是动态的：

```javascript
const math = require("./math"); // 不知道用到了哪些函数
```

所以 ESM 是打包工具“更喜欢”的格式。

🔹 2. 浏览器原生支持  
ESM 是浏览器原生支持的模块格式，Vite 等现代工具希望构建结果是 ESM，以支持：

- 不打包时的浏览器直接运行
- 原生 module federation（模块联邦）

### 1.3 与 webpack 的差异

解决了传统工具在大型项目中，因冷启动时需要打包所有模块而导致的开发服务器启动慢和热更新（HMR）慢的问题。

⚖️「权衡」: Webpack 的“万物皆可打包”模型在生产环境中非常强大和成熟，但在开发阶段却显得笨重。

Vite 则为开发和生产环境选择了不同的策略：开发时追求极致速度（不打包），生产时追求最终性能（用 Rollup 打包优化）

为什么 Vite 比 Webpack 快？

- Vite 充分利用 esm ，将开发环境下的模块文件直接作为浏览器要执行的文件，而不是像 Webpack 那样先打包，再交给浏览器执行。
- Webpack 是基于 Node.js 构建的，而 Vite 则是基于 esbuild 进行预构建，esbuild 是基于 Go 编写的，所以 Vite 的构建速度比 Webpack 快很多。
- 热更新：在 Webpack 中，当一个模块或其依赖的模块内容改变时，需要重新编译这些模块。  
  而在 Vite 中，当某个模块内容改变时，只需要让浏览器重新请求该模块即可，这大大减少了热更新的时间。

Webpack： 需要重新打包并注入， 服务端推送更新模块

vite: **无需手动 patch 模块**，**浏览器原生机制就能替换模块**

#### 1.4 EsBuild

EsBuild 是一个用 Go 编写的 JavaScript 打包器。

Vite 在构建流程中大量使用了 [esbuild](https://github.com/vitejs/vite/blob/c4d5940e1519a2d9d68505a911123398a136e60b/packages/vite/src/node/optimizer/index.ts#L825)，但不是用来“打包”，而是用来完成 快速预构建、转译、依赖分析等任务，这是它比 Webpack 快很多的一个关键原因。

🔹 依赖预构建: 在开发阶段，Vite 会将 react、react-dom 等 非 ESM 的依赖（如 CommonJS）转为 ESM，然后缓存起来。最后处理路径为 .vite/deps/\*\*.js

📦 为什么这样做？

- 让浏览器能直接用原生模块（只支持 ESM）。将仅在 Node.js 环境中使用的 CommonJS 或 UMD 格式的模块转换为浏览器支持的 ESM 格式。
- 避免重复模块解析，提高浏览器加载效率。将有许多内部模块的 ESM 依赖关系（例如 lodash-es）转换为单个模块，以减少浏览器的 HTTP 请求数量

由于第三方依赖在开发过程中很少变动，所以这个预构建过程只需要运行一次即可

触发重新预构建的关键条件: 依赖版本变动、配置变更、缓存丢失、手动清理等

🔧 配置示例（vite.config.js）：

```typescript
export default {
  optimizeDeps: {
    include: ["react", "react-dom"], // 强制预构建
  },
};
```

存入缓存目录 .vite/deps/\*\*.js

🔹 代码转译 (Transpiling): 利用 esbuild 的 [transform 方法](https://github.com/vitejs/vite/blob/c4d5940e1519a2d9d68505a911123398a136e60b/packages/vite/src/node/plugins/esbuild.ts#L201)，将 TypeScript / JSX / TSX 文件转换为纯 JavaScript。

⚠️「陷阱」: 新手常常误以为 Vite 的生产打包也是由 esbuild 完成的。这是一个经典的误解。默认情况下，Vite 使用 Rollup 进行生产构建，因为 Rollup 提供了更成熟的插件生态和更高级的代码分割策略，这对于生成高度优化的生产包至关重要。

#### 1.5 Rollup

Rollup 是一个 JavaScript 打包器，它可以将多个 JavaScript 文件打包成一个文件。

## 模块二：开发服务器核心功能

### 2.1 import.meta.env

`import.meta.env` 是 Vite 提供的一个特殊对象，用于将环境变量安全地暴露给客户端（浏览器）代码。

- 不可以解构 `import.meta.env` 对象，例如 `const { VITE_API_URL } = import.meta.env;`。这是无效的，因为 Vite 是在构建阶段通过静态文本替换来注入环境变量的。你必须始终使用完整的属性访问语法：`const apiUrl = import.meta.env.VITE_API_URL;`。

### 2.2 import.meta.glob

`import.meta.glob` 是 Vite 的一个元信息对象，它可以用来动态导入项目中的所有匹配指定模式的文件。

```typescript
const modules = import.meta.glob("./pages/**/*.vue", { eager: true }); // 默认 eager: false，懒加载
```

## 模块三：Vite 配置详解

resolve.alias 选项来配置别名

```typescript
export default {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
};
```

预配置

```typescript
export default {
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["vue"],
  },
};
```

## 模块四：Vite 插件开发

### 4.1 通用钩子

🔹 通用钩子: 这些钩子直接继承自 Rollup 的插件规范，例如 `resolveId`, `load`, `transform`。它们在开发服务器 (serve) 和生产构建 (build) 两个阶段都会执行，因为它们作用于通用的模块图解析和转换流程。 Vite 自己内部的各种功能（比如 Vue 文件支持、CSS 处理、依赖预构建等）也大量使用这些钩子实现

- `resolveId(source, importer) ——  得到模块 ID`  
  支持别名 alias、路径映射
- `load(id) —— 模块加载钩子，  加载模块源码`  
  支持加载各种文件类型，如 CSS、图片等
- `transform(code, id) —— 对源码进行转换处理`  
  支持将代码转换为另一种格式，插入 HMR 逻辑，插入环境变量

### 4.2 Vite 特有钩子

🔹 Vite 特有钩子: 这些钩子是 Vite 为了实现其独特功能（主要是开发服务器）而添加的，例如 `config`, `configureServer`, `handleHotUpdate`。它们通常只在开发阶段 (serve 命令) 被调用。

⚖️「权衡」: 当你编写插件时，如果你的目标是处理模块内容且希望在开发和生产环境行为一致（例如，转换一种自定义文件格式），你应该使用通用钩子。如果你需要与开发服务器深度交互，例如添加中间件或自定义 HMR 逻辑，那么你必须使用 Vite 特有钩子。

### 4.3 插件开发

请编写一个简单的 Vite 插件，功能是在所有 .js 文件中，将字符串 **APP_VERSION** 替换为项目 package.json 中的 version 字段。

这个需求可以通过 transform 钩子和 Node.js 的 fs 模块轻松实现。

```typescript
// version-injector-plugin.js
import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

export default function versionInjectorPlugin() {
  return {
    name: "version-injector", // 唯一的插件名称
    transform(code, id) {
      // 只处理 .js 文件
      if (id.endsWith(".js")) {
        return {
          // 使用正则进行全局替换
          code: code.replace(/__APP_VERSION__/g, packageJson.version),
          // 如果没有改变源码映射，可以返回 null
          map: null,
        };
      }
      // 对于其他文件，返回 undefined 或 null 表示不转换
      return null;
    },
  };
}
```

## 模块五：生产构建与优化

JavaScript: 默认使用 esbuild。

CSS: 默认与 PostCSS 集成，并利用其能力进行压缩。

### 5.1 @vitejs/plugin-legacy

🔍「原理」: 这个插件非常智能，它会为你做两件事：

- 生成一个兼容性 chunk: 它会利用 Babel 和 Terser，为你应用中的每个 chunk 都创建一个对应的、经过语法降级和 Polyfill 注入的“兼容性”版本。
- 生成一个 nomodule script: 它会在最终的 index.html 中注入一个特殊的脚本。这个脚本会检测浏览器是否支持原生 ESM。
  - 现代浏览器: 会忽略带有 nomodule 属性的脚本，正常加载原生 ESM 的 chunk。
  - 旧版浏览器: 无法识别 type="module"，会跳过它，转而去加载并执行带有 nomodule 属性的兼容性脚本和 Polyfill。

## 模块六：高级主题与底层原理

### 6.1 服务器端渲染（SSR）

服务器端渲染（SSR）是指将原本完全在客户端（浏览器）执行的组件（如 Vue/React 组件）渲染过程，放到服务器端预先执行一次，生成完整的 HTML 字符串，然后将这个 HTML 直接发送给浏览器的技术。它主要解决两个问题：

- 首屏加载性能 (FCP/TTC)：用户可以更快地看到页面内容，因为浏览器无需等待所有 JS 下载和执行完毕才能渲染出首屏。
- 搜索引擎优化 (SEO)：搜索引擎爬虫可以直接抓取到完整的、包含内容的 HTML，而不是一个空壳的 HTML 和一堆 JS。
