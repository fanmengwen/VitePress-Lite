// scripts/simple-prerender.js
import fs from "fs-extra";
import path from "path";
import { collectPrerenderRoutes, extractPageMeta } from "./collect-routes.js";

/**
 * 轻量级预渲染方案
 * 不依赖浏览器，直接生成包含SEO信息的HTML模板
 */
class SimplePrerender {
  constructor(options = {}) {
    this.options = {
      outputDir: "dist-prerender",
      baseUrl: "https://your-domain.com",
      siteName: "VitePress Lite",
      ...options,
    };
  }

  /**
   * 生成基础HTML模板
   */
  generateHTMLTemplate(route, meta) {
    const { title, description, keywords, author, date } = meta;

    return `<!doctype html>
<html lang="zh-CN" data-prerendered="true">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E💬%3C/text%3E%3C/svg%3E" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- SEO Meta Tags -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <meta name="author" content="${author}" />
    <meta name="robots" content="index,follow" />
    
    <!-- Open Graph Tags -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${this.options.siteName}" />
    <meta property="og:url" content="${this.options.baseUrl}${route}" />
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${title}",
      "description": "${description}",
      "author": {
        "@type": "Person",
        "name": "${author}"
      },
      "publisher": {
        "@type": "Organization",
        "name": "${this.options.siteName}"
      }${date ? `,\n      "datePublished": "${date}",\n      "dateModified": "${date}"` : ""}
    }
    </script>
    
    <!-- Preload critical resources -->
    <link rel="preload" href="/src/main.ts" as="script" crossorigin />
    <link rel="preload" href="/src/styles/markdown-layout.css" as="style" />
  </head>
  <body>
    <div id="app">
      <!-- 基础内容结构，确保搜索引擎能够理解页面结构 -->
      <main>
        <article>
          <header>
            <h1>${title}</h1>
            <p>${description}</p>
          </header>
          <div class="content">
            <p>正在加载内容...</p>
            <noscript>
              <p>此页面需要JavaScript才能正常显示。请启用JavaScript后重新加载页面。</p>
              <p>This page requires JavaScript to display properly. Please enable JavaScript and reload the page.</p>
            </noscript>
          </div>
        </article>
      </main>
    </div>
    
    <!-- Vue应用入口 -->
    <script type="module" src="/src/main.ts"></script>
    
    <!-- 预渲染标识脚本 -->
    <script>
      // 标记页面为预渲染版本
      window.__PRERENDERED__ = true;
      window.__ROUTE__ = "${route}";
      window.__META__ = ${JSON.stringify(meta)};
    </script>
  </body>
</html>`;
  }

  /**
   * 为单个路由生成预渲染HTML
   */
  async generateRouteHTML(route) {
    try {
      console.log(`📄 生成路由: ${route}`);

      // 提取页面元数据
      const meta = extractPageMeta(route);

      // 生成HTML
      const html = this.generateHTMLTemplate(route, meta);

      // 确定输出路径
      let filePath;
      if (route === "/") {
        filePath = path.join(this.options.outputDir, "index.html");
      } else {
        const routePath = route.startsWith("/") ? route.slice(1) : route;
        filePath = path.join(this.options.outputDir, routePath, "index.html");
      }

      // 确保目录存在
      await fs.ensureDir(path.dirname(filePath));

      // 写入文件
      await fs.writeFile(filePath, html, "utf8");

      console.log(`✅ 已生成: ${filePath}`);

      return {
        route,
        filePath,
        meta,
        success: true,
      };
    } catch (error) {
      console.error(`❌ 生成失败 ${route}:`, error.message);
      return {
        route,
        error: error.message,
        success: false,
      };
    }
  }

  /**
   * 复制静态资源
   */
  async copyAssets() {
    console.log("📦 复制静态资源...");

    const publicDir = path.resolve("public");
    const srcDir = path.resolve("src");

    // 复制public目录
    if (await fs.pathExists(publicDir)) {
      await fs.copy(publicDir, this.options.outputDir);
      console.log("✅ 已复制 public/ 目录");
    }

    // 创建src目录的符号链接或复制（开发时使用）
    const srcTargetDir = path.join(this.options.outputDir, "src");
    if (await fs.pathExists(srcDir)) {
      await fs.ensureDir(path.dirname(srcTargetDir));
      // 在开发环境下创建符号链接，生产环境下需要实际复制
      try {
        await fs.symlink(path.resolve(srcDir), srcTargetDir);
        console.log("✅ 已创建 src/ 符号链接");
      } catch (error) {
        // 如果符号链接失败（如Windows），则复制
        await fs.copy(srcDir, srcTargetDir);
        console.log("✅ 已复制 src/ 目录");
      }
    }
  }

  /**
   * 生成sitemap.xml
   */
  async generateSitemap(routes, results) {
    console.log("🗺️ 生成sitemap.xml...");

    const successfulRoutes = results.filter((r) => r.success);

    const urls = successfulRoutes
      .map((result) => {
        const url = result.route === "/" ? "" : result.route;
        const lastmod = result.meta.date
          ? new Date(result.meta.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        return `  <url>
    <loc>${this.options.baseUrl}${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${result.route === "/" ? "1.0" : "0.8"}</priority>
  </url>`;
      })
      .join("\n");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    await fs.writeFile(
      path.join(this.options.outputDir, "sitemap.xml"),
      sitemap,
      "utf8"
    );

    console.log("✅ 已生成 sitemap.xml");
  }

  /**
   * 生成robots.txt
   */
  async generateRobots() {
    console.log("🤖 生成robots.txt...");

    const robots = `User-agent: *
Allow: /

Sitemap: ${this.options.baseUrl}/sitemap.xml

# 禁止爬取的路径
Disallow: /api/
Disallow: /*.json$
Disallow: /*?*
`;

    await fs.writeFile(
      path.join(this.options.outputDir, "robots.txt"),
      robots,
      "utf8"
    );

    console.log("✅ 已生成 robots.txt");
  }

  /**
   * 执行完整的预渲染流程
   */
  async render() {
    try {
      console.log("🚀 开始轻量级预渲染...\n");

      // 1. 清理输出目录
      await fs.emptyDir(this.options.outputDir);
      console.log(`🧹 已清理输出目录: ${this.options.outputDir}\n`);

      // 2. 收集路由
      const routes = await collectPrerenderRoutes();
      console.log(`📋 发现 ${routes.length} 个路由需要预渲染\n`);

      // 3. 生成所有路由的HTML
      const results = [];
      for (const route of routes) {
        const result = await this.generateRouteHTML(route);
        results.push(result);
      }

      // 4. 复制静态资源
      await this.copyAssets();

      // 5. 生成SEO文件
      await this.generateSitemap(routes, results);
      await this.generateRobots();

      // 6. 统计结果
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      console.log(`\n🎉 预渲染完成!`);
      console.log(`✅ 成功: ${successful} 个页面`);
      if (failed > 0) {
        console.log(`❌ 失败: ${failed} 个页面`);
      }
      console.log(`📁 输出目录: ${this.options.outputDir}`);

      return {
        totalRoutes: routes.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      console.error("❌ 预渲染失败:", error);
      throw error;
    }
  }
}

// 如果直接运行此脚本，执行预渲染
if (import.meta.url === `file://${process.argv[1]}`) {
  const prerender = new SimplePrerender({
    outputDir: "dist-prerender",
    baseUrl: "https://your-domain.com", // 替换为实际域名
    siteName: "VitePress Lite",
  });

  prerender.render().catch(console.error);
}
