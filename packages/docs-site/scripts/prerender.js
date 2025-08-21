// scripts/prerender.js
import { createServer } from "vite";
import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";
import { collectPrerenderRoutes, extractPageMeta } from "./collect-routes.js";
import { SitemapGenerator } from "./generate-sitemap.js";

/**
 * 预渲染核心实现
 * 使用 Puppeteer 渲染页面并提取HTML
 */
export class PrerenderEngine {
  constructor(options = {}) {
    this.options = {
      baseUrl: "http://localhost:5173",
      outputDir: "dist-prerender",
      timeout: 30000,
      waitForSelector: "main",
      ...options,
    };
    this.browser = null;
    this.viteServer = null;
  }

  /**
   * 启动Vite开发服务器
   */
  async startViteServer() {
    console.log("🚀 启动Vite开发服务器...");

    this.viteServer = await createServer({
      server: {
        port: 5173,
        host: "localhost",
      },
      logLevel: "error", // 减少日志噪音
    });

    await this.viteServer.listen();
    console.log("✅ Vite服务器已启动");
  }

  /**
   * 启动Puppeteer浏览器
   */
  async startBrowser() {
    console.log("🌐 启动无头浏览器...");

    this.browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
      ],
    });

    console.log("✅ 浏览器已启动");
  }

  /**
   * 预渲染单个路由
   */
  async renderRoute(route) {
    const page = await this.browser.newPage();

    try {
      // 设置视口
      await page.setViewport({ width: 1200, height: 800 });

      // 访问页面
      const url = `${this.options.baseUrl}${route}`;
      console.log(`📄 渲染路由: ${route} -> ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: this.options.timeout,
      });

      // 等待Vue应用完全加载
      await page.waitForSelector(this.options.waitForSelector, {
        timeout: this.options.timeout,
      });

      // 等待一段时间确保所有异步内容加载完成
      await page.waitForTimeout(2000);

      // 获取完整的HTML内容
      const html = await page.content();

      // 提取页面元数据用于验证
      const title = await page.title();
      const description = await page
        .$eval('meta[name="description"]', (el) => el.getAttribute("content"))
        .catch(() => "");

      console.log(`✅ 成功渲染: ${route} (title: ${title})`);

      return {
        route,
        html,
        title,
        description,
      };
    } catch (error) {
      console.error(`❌ 渲染失败 ${route}:`, error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * 保存渲染结果到文件
   */
  async saveRenderedHTML(renderResult) {
    if (!renderResult) return;

    const { route, html } = renderResult;

    // 确定输出文件路径
    let filePath;
    if (route === "/") {
      filePath = path.join(this.options.outputDir, "index.html");
    } else {
      // 创建目录结构: /docs/setting -> docs/setting/index.html
      const routePath = route.startsWith("/") ? route.slice(1) : route;
      filePath = path.join(this.options.outputDir, routePath, "index.html");
    }

    // 确保目录存在
    await fs.ensureDir(path.dirname(filePath));

    // 优化HTML: 移除不必要的开发脚本，保留水合所需的脚本
    const optimizedHTML = this.optimizeHTML(html);

    // 保存文件
    await fs.writeFile(filePath, optimizedHTML, "utf8");
    console.log(`💾 已保存: ${filePath}`);
  }

  /**
   * 优化HTML输出
   */
  optimizeHTML(html) {
    return (
      html
        // 移除Vite的HMR脚本
        .replace(/<script[^>]*vite\/client[^>]*><\/script>/g, "")
        // 确保CSS正确内联或链接
        .replace(/http:\/\/localhost:5173/g, "")
        // 添加预渲染标识
        .replace(/<html/, '<html data-prerendered="true"')
    );
  }

  /**
   * 执行完整的预渲染流程
   */
  async render() {
    try {
      // 1. 清理输出目录
      await fs.emptyDir(this.options.outputDir);
      console.log(`🧹 已清理输出目录: ${this.options.outputDir}`);

      // 2. 收集需要渲染的路由
      const routes = await collectPrerenderRoutes();
      console.log(`📋 发现 ${routes.length} 个路由需要预渲染`);

      // 3. 启动服务器和浏览器
      await this.startViteServer();
      await this.startBrowser();

      // 4. 渲染所有路由
      const renderResults = [];
      for (const route of routes) {
        const result = await this.renderRoute(route);
        if (result) {
          renderResults.push(result);
          await this.saveRenderedHTML(result);
        }
      }

      // 5. 生成站点地图和SEO文件
      await this.generateSEOFiles(renderResults);

      console.log(
        `🎉 预渲染完成! 成功渲染 ${renderResults.length}/${routes.length} 个页面`
      );

      return renderResults;
    } catch (error) {
      console.error("❌ 预渲染失败:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 生成SEO文件（站点地图和robots.txt）
   */
  async generateSEOFiles(renderResults) {
    const sitemapGenerator = new SitemapGenerator();

    // 提取路由列表
    const routes = renderResults.map((result) => result.route);

    // 生成站点地图
    const sitemap = await sitemapGenerator.generateSitemapXML(routes);
    await sitemapGenerator.saveSitemap(sitemap, this.options.outputDir);

    // 生成robots.txt
    await sitemapGenerator.generateRobotsTxt(this.options.outputDir);

    console.log("🗺️ SEO文件生成完成");
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔌 浏览器已关闭");
    }

    if (this.viteServer) {
      await this.viteServer.close();
      console.log("🔌 Vite服务器已关闭");
    }
  }
}

// 如果直接运行此脚本，执行预渲染
if (import.meta.url === `file://${process.argv[1]}`) {
  const prerender = new PrerenderEngine({
    outputDir: "dist-prerender",
  });

  prerender.render().catch(console.error);
}
