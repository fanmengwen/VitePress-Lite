// scripts/collect-routes.js
import glob from "fast-glob";
import { readFileSync } from "fs";
import matter from "gray-matter";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 收集所有需要预渲染的路由
 * 这个函数复用了 virtual-pages-plugin 的逻辑
 */
export async function collectPrerenderRoutes() {
  try {
    // 1. 扫描所有markdown文件
    const pages = await glob("docs/**/*.md", {
      cwd: join(__dirname, ".."),
    });

    // 2. 转换为路由路径
    const routes = pages.map((page) => {
      const routePath = page
        .replace(/^docs\//, "")
        .replace(/\.md$/, "")
        .replace(/index$/, "");
      return `/${routePath}`.replace(/\/$/, "") || "/";
    });

    // 3. 添加静态路由
    const staticRoutes = ["/"];

    // 4. 合并并去重
    const allRoutes = [...new Set([...staticRoutes, ...routes])];

    console.log("🎯 收集到的预渲染路由:", allRoutes);
    return allRoutes;
  } catch (error) {
    console.error("❌ 路由收集失败:", error);
    return ["/"];
  }
}

/**
 * 提取页面的SEO元数据
 */
export function extractPageMeta(route) {
  try {
    // 将路由转换回文件路径
    let filePath;
    if (route === "/") {
      return {
        title: "VitePress Lite - 轻量级文档站点",
        description: "基于Vite + Vue 3的现代化文档站点解决方案",
        keywords: "vite,vue,documentation,markdown",
      };
    }

    filePath = `docs${route}.md`;
    const content = readFileSync(filePath, "utf-8");
    const { data } = matter(content);

    return {
      title: data.title || `VitePress Lite - ${route.split("/").pop()}`,
      description: data.description || `${data.title}相关文档`,
      keywords: data.tags ? data.tags.join(",") : "vite,vue,documentation",
      author: data.author || "VitePress Lite",
      date: data.date,
    };
  } catch (error) {
    console.warn(`⚠️ 无法提取 ${route} 的元数据:`, error.message);
    return {
      title: "VitePress Lite",
      description: "VitePress Lite 文档页面",
      keywords: "vite,vue,documentation",
    };
  }
}

