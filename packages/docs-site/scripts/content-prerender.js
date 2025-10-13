// scripts/content-prerender.js
import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import { collectPrerenderRoutes, extractPageMeta } from "./collect-routes.js";

/**
 * 真实内容预渲染方案
 * 直接渲染Markdown内容到HTML
 */
class ContentPrerender {
  constructor(options = {}) {
    this.options = {
      outputDir: "dist-prerender",
      baseUrl: "https://your-domain.com",
      siteName: "VitePress Lite",
      docsDir: "docs",
      ...options,
    };

    // 初始化Markdown渲染器
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    }).use(markdownItAnchor, {
      permalink: true,
      permalinkSymbol: "#",
    });
  }

  /**
   * 读取并渲染Markdown文件内容
   */
  async renderMarkdownContent(route) {
    try {
      // 将路由转换为文件路径
      let markdownPath;
      if (route === "/") {
        // 首页显示索引内容
        return this.generateIndexContent();
      } else {
        const filePath = route.startsWith("/") ? route.slice(1) : route;
        markdownPath = path.join(this.options.docsDir, `${filePath}.md`);
      }

      if (!(await fs.pathExists(markdownPath))) {
        console.warn(`⚠️ Markdown文件不存在: ${markdownPath}`);
        return this.generateNotFoundContent(route);
      }

      // 读取Markdown文件
      const fileContent = await fs.readFile(markdownPath, "utf-8");
      const { data: frontmatter, content } = matter(fileContent);

      // 渲染Markdown为HTML
      const htmlContent = this.md.render(content);

      return {
        frontmatter,
        htmlContent,
        title: frontmatter.title || path.basename(markdownPath, ".md"),
        hasContent: true,
      };
    } catch (error) {
      console.error(`❌ 渲染Markdown失败 ${route}:`, error.message);
      return this.generateErrorContent(route, error);
    }
  }

  /**
   * 生成首页内容
   */
  generateIndexContent() {
    return {
      frontmatter: {
        title: "VitePress Lite - 首页",
        description: "欢迎来到VitePress Lite文档站点",
      },
      htmlContent: `
        <div class="home-hero">
          <h1>🚀 VitePress Lite</h1>
          <p class="hero-tagline">基于Vite + Vue 3的现代化文档站点</p>
          <div class="hero-actions">
            <a href="/total" class="btn btn-primary">开始阅读</a>
            <a href="/setting" class="btn btn-secondary">项目配置</a>
          </div>
        </div>
        <div class="features">
          <div class="feature">
            <h3>⚡ 极速开发</h3>
            <p>基于Vite的快速热重载，开发体验丝滑</p>
          </div>
          <div class="feature">
            <h3>📝 Markdown驱动</h3>
            <p>使用Markdown编写文档，专注内容创作</p>
          </div>
          <div class="feature">
            <h3>🔍 SEO友好</h3>
            <p>预渲染技术确保搜索引擎完美收录</p>
          </div>
        </div>
      `,
      title: "VitePress Lite - 首页",
      hasContent: true,
    };
  }

  /**
   * 生成404内容
   */
  generateNotFoundContent(route) {
    return {
      frontmatter: {
        title: "页面未找到",
        description: `路径 ${route} 对应的页面不存在`,
      },
      htmlContent: `
        <div class="not-found">
          <h1>🔍 页面未找到</h1>
          <p>抱歉，您访问的页面 <code>${route}</code> 不存在。</p>
          <p><a href="/">返回首页</a></p>
        </div>
      `,
      title: "页面未找到",
      hasContent: true,
    };
  }

  /**
   * 生成错误内容
   */
  generateErrorContent(route, error) {
    return {
      frontmatter: {
        title: "页面加载错误",
        description: `页面 ${route} 加载时发生错误`,
      },
      htmlContent: `
        <div class="error">
          <h1>⚠️ 页面加载错误</h1>
          <p>页面 <code>${route}</code> 加载时发生错误：</p>
          <pre><code>${error.message}</code></pre>
          <p><a href="/">返回首页</a></p>
        </div>
      `,
      title: "页面加载错误",
      hasContent: false,
    };
  }

  /**
   * 生成包含真实内容的完整HTML
   */
  generateHTMLWithContent(route, meta, content, assets = { css: [], js: [] }) {
    const { title, description, keywords, author, date } = meta;
    const { htmlContent, frontmatter } = content;

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
    <meta name="author" content="${author || "VitePress Lite"}" />
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
        "name": "${author || "VitePress Lite"}"
      },
      "publisher": {
        "@type": "Organization",
        "name": "${this.options.siteName}"
      }${date ? `,\n      "datePublished": "${date}",\n      "dateModified": "${date}"` : ""}
    }
    </script>
    
    <!-- 内联关键CSS样式，确保首屏渲染 -->
    <style>
      /* 关键渲染路径样式 */
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      .markdown-content {
        max-width: 800px;
        margin: 0 auto;
      }
      .markdown-content h1 {
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
        color: #2c3e50;
      }
      .markdown-content h2 {
        color: #2c3e50;
        margin-top: 30px;
      }
      .markdown-content pre {
        background: #f8f8f8;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
      }
      .markdown-content code {
        background: #f0f0f0;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', monospace;
      }
      .home-hero {
        text-align: center;
        padding: 60px 0;
      }
      .hero-tagline {
        font-size: 1.2em;
        color: #666;
        margin: 20px 0;
      }
      .features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 30px;
        margin-top: 40px;
      }
      .feature {
        text-align: center;
        padding: 20px;
      }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        margin: 0 10px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
      }
      .btn-primary {
        background: #42b883;
        color: white;
      }
      .btn-secondary {
        background: #f8f8f8;
        color: #333;
        border: 1px solid #ddd;
      }
      .not-found, .error {
        text-align: center;
        padding: 60px 20px;
      }
      
      /* 加载态隐藏，防止闪烁 */
      .loading-placeholder {
        display: none;
      }
    </style>
    
    <!-- 引用构建后的CSS文件 -->
    ${assets.css.map((css) => `<link rel="stylesheet" href="${css}" />`).join("\n    ")}
  </head>
  <body>
    <div id="app">
      <!-- 预渲染的真实内容 -->
      <main class="markdown-content">
        ${htmlContent}
      </main>
      
      <!-- 加载占位符（仅在JavaScript失效时显示） -->
      <div class="loading-placeholder">
        <p>正在加载内容...</p>
        <noscript>
          <p>此页面需要JavaScript才能正常显示。请启用JavaScript后重新加载页面。</p>
        </noscript>
      </div>
    </div>
    
    <!-- 引用构建后的JS文件 -->
    ${assets.js.map((js) => `<script type="module" src="${js}"></script>`).join("\n    ")}
    
    <!-- 预渲染元数据 -->
    <script>
      window.__PRERENDERED__ = true;
      window.__ROUTE__ = "${route}";
      window.__META__ = ${JSON.stringify(meta)};
      window.__CONTENT__ = ${JSON.stringify({ frontmatter, hasContent: content.hasContent })};
    </script>
  </body>
</html>`;
  }

  /**
   * 为单个路由生成包含内容的HTML
   */
  async generateRouteWithContent(route) {
    try {
      console.log(`📄 渲染内容: ${route}`);

      // 1. 提取SEO元数据
      const meta = extractPageMeta(route);

      // 2. 获取构建资源
      const assets = await this.getBuildAssets();

      // 3. 渲染Markdown内容
      const content = await this.renderMarkdownContent(route);

      // 4. 生成完整HTML
      const html = this.generateHTMLWithContent(route, meta, content, assets);

      // 5. 确定输出路径并保存
      let filePath;
      if (route === "/") {
        filePath = path.join(this.options.outputDir, "index.html");
      } else {
        const routePath = route.startsWith("/") ? route.slice(1) : route;
        filePath = path.join(this.options.outputDir, routePath, "index.html");
      }

      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, html, "utf8");

      console.log(
        `✅ 已生成: ${filePath} (${content.hasContent ? "包含内容" : "占位内容"})`
      );

      return {
        route,
        filePath,
        meta,
        content,
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
   * 获取构建后的资源文件
   */
  async getBuildAssets() {
    const assetsDir = path.resolve("dist/assets");
    const assets = {
      css: [],
      js: [],
    };

    if (await fs.pathExists(assetsDir)) {
      const files = await fs.readdir(assetsDir);

      for (const file of files) {
        if (file.endsWith(".css")) {
          assets.css.push(`/assets/${file}`);
        } else if (file.endsWith(".js") && file.includes("index-")) {
          // 只包含主入口JS文件
          assets.js.push(`/assets/${file}`);
        }
      }
    }

    return assets;
  }

  /**
   * 复制构建资源到预渲染目录
   */
  async copyAssets() {
    console.log("📦 复制静态资源...");

    // 复制整个dist目录的assets
    const distAssetsDir = path.resolve("dist/assets");
    const targetAssetsDir = path.join(this.options.outputDir, "assets");

    if (await fs.pathExists(distAssetsDir)) {
      await fs.copy(distAssetsDir, targetAssetsDir);
      console.log("✅ 已复制构建资源 dist/assets/");
    }

    // 复制public目录
    const publicDir = path.resolve("public");
    if (await fs.pathExists(publicDir)) {
      await fs.copy(publicDir, this.options.outputDir);
      console.log("✅ 已复制 public/ 目录");
    }
  }

  /**
   * 生成sitemap和robots（复用简单预渲染的逻辑）
   */
  async generateSEOFiles(results) {
    // Sitemap
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

    // Robots
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
   * 生成API降级响应
   */
  async generateApiFallbacks() {
    console.log("🔗 生成API降级响应...");

    try {
      // 直接实现API降级生成逻辑
      await this.generateHealthFallback();
      await this.generatePostsFallback();
      await this.generateSpecificPostFallbacks();

      console.log("✅ 已生成API降级响应");
    } catch (error) {
      console.warn("⚠️ API降级响应生成失败:", error.message);
      // 不阻断主流程，继续执行
    }
  }

  /**
   * 生成健康检查降级响应
   */
  async generateHealthFallback() {
    const healthResponse = {
      success: true,
      message: "Static site - health check",
      data: { status: "static", timestamp: new Date().toISOString() },
    };

    const healthDir = path.join(this.options.outputDir, "health");
    await fs.ensureDir(healthDir);

    const html = this.generateApiResponseHtml(healthResponse, "Health Check");
    await fs.writeFile(path.join(healthDir, "index.html"), html, "utf8");
  }

  /**
   * 生成Posts API降级响应
   */
  async generatePostsFallback() {
    const postsResponse = {
      success: true,
      message: "Static site - posts not available",
      data: { posts: [] },
    };

    const postsDir = path.join(this.options.outputDir, "api", "posts");
    await fs.ensureDir(postsDir);

    const html = this.generateApiResponseHtml(postsResponse, "Posts API");
    await fs.writeFile(path.join(postsDir, "index.html"), html, "utf8");
  }

  /**
   * 生成特定Post降级响应
   */
  async generateSpecificPostFallbacks() {
    const routes = [
      "unit/unit1",
      "unit/unit2",
      "unit/unit3",
      "total",
      "hmr",
      "setting",
    ];

    for (const route of routes) {
      const postResponse = {
        success: false,
        error: "not_found",
        message: "Post not found in static site",
        data: { suggestion: `Visit /${route} for content` },
      };

      const postDir = path.join(this.options.outputDir, "api", "posts", route);
      await fs.ensureDir(postDir);

      const html = this.generateApiResponseHtml(
        postResponse,
        `Post: ${route}`,
        404
      );
      await fs.writeFile(path.join(postDir, "index.html"), html, "utf8");
    }
  }

  /**
   * 生成API响应HTML
   */
  generateApiResponseHtml(data, title, statusCode = 200) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #f5f5f5; }
    .container { background: white; padding: 20px; border-radius: 4px; }
    .json { background: #f8f8f8; padding: 15px; border-radius: 4px; white-space: pre; }
  </style>
</head>
<body>
  <div class="container">
    <h2>📄 ${title} (Static Response)</h2>
    <p><strong>Status:</strong> ${statusCode}</p>
    <div class="json">${JSON.stringify(data, null, 2)}</div>
    <p><em>This is a static site. API endpoints return fallback responses.</em></p>
  </div>
</body>
</html>`;
  }

  /**
   * 执行完整的内容预渲染流程
   */
  async render() {
    try {
      console.log("🚀 开始内容预渲染...\n");

      // 1. 清理输出目录
      await fs.emptyDir(this.options.outputDir);
      console.log(`🧹 已清理输出目录: ${this.options.outputDir}\n`);

      // 2. 收集路由
      const routes = await collectPrerenderRoutes();
      console.log(`📋 发现 ${routes.length} 个路由需要预渲染\n`);

      // 3. 渲染所有路由的内容
      const results = [];
      for (const route of routes) {
        const result = await this.generateRouteWithContent(route);
        results.push(result);
      }

      // 4. 复制静态资源
      await this.copyAssets();

      // 5. 生成SEO文件
      await this.generateSEOFiles(results);

      // 6. 生成API降级响应
      await this.generateApiFallbacks();

      // 7. 统计结果
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      const withContent = results.filter(
        (r) => r.success && r.content?.hasContent
      ).length;

      console.log(`\n🎉 内容预渲染完成!`);
      console.log(`✅ 成功: ${successful} 个页面`);
      console.log(`📝 包含内容: ${withContent} 个页面`);
      if (failed > 0) {
        console.log(`❌ 失败: ${failed} 个页面`);
      }
      console.log(`📁 输出目录: ${this.options.outputDir}`);

      return {
        totalRoutes: routes.length,
        successful,
        failed,
        withContent,
        results,
      };
    } catch (error) {
      console.error("❌ 内容预渲染失败:", error);
      throw error;
    }
  }
}

// 如果直接运行此脚本，执行内容预渲染
if (import.meta.url === `file://${process.argv[1]}`) {
  const prerender = new ContentPrerender({
    outputDir: "dist-prerender",
    baseUrl: "https://your-domain.com",
    siteName: "VitePress Lite",
  });

  prerender.render().catch(console.error);
}
