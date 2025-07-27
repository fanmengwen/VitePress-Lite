import glob from "fast-glob";
import { readFileSync } from "fs";
import matter from "gray-matter";

function pathToRoutePath(path) {
  // 传入的 path 例子: 'docs/guide/installation.md'
  const routePath = path
    .replace(/^docs\//, "") // -> 'guide/installation.md'

    .replace(/\.md$/, "") // -> 'guide/installation'

    .replace(/index$/, "") // 对于 'guide/installation' -> 不变
    // 对于 'guide/index' -> 'guide/'

    .replace(/\/$/, ""); // 对于 'guide/' -> 'guide'

  return `/${routePath}`.replace(/\/$/, "/");
}

export default function virtualPagesPlugin() {
  const virtualId = "virtual:pages";
  const resolvedVirtualId = "\0" + virtualId;

  return {
    name: "virtual-pages-plugin",

    // 解析虚拟页面
    resolveId(id) {
      if (id === virtualId) {
        return resolvedVirtualId;
      }
    },

    // 加载虚拟页面
    async load(id) {
      if (id === resolvedVirtualId) {
        // 1. 扫描文件
        const pages = await glob("docs/**/*.md");

        const routes = pages.map((page) => {
          const routePath = pathToRoutePath(page);
          
          // 读取 markdown 文件并解析 frontmatter
          let title = page.replace(/^docs\//, "").replace(/\.md$/, "");
          try {
            const fileContent = readFileSync(page, 'utf-8');
            const { data } = matter(fileContent);
            if (data.title) {
              title = data.title;
            }
          } catch (error) {
            console.warn(`Failed to read title from ${page}:`, error.message);
          }
          
          return {
            path: routePath,
            title: title,
            component: `() => import('/${page}')`,
          };
        });
        const routesCode = JSON.stringify(routes, null, 2).replace(
          /"component": "(\(\) => import\('.*?'\))"/g,
          '"component": $1',
        );

        return `export default ${routesCode}`;
      }
    },
  };
}
