// scripts/generate-sitemap.js - 独立的站点地图生成器
import fs from "fs-extra";
import path from "path";
import { collectPrerenderRoutes } from "./collect-routes.js";
import seoConfig from "../seo.config.js";

/**
 * 站点地图生成器
 */
export class SitemapGenerator {
  constructor(options = {}) {
    this.config = {
      ...seoConfig,
      ...options,
    };
  }

  /**
   * 判断路径是否应该被排除
   */
  shouldExcludeRoute(route) {
    return this.config.sitemap.exclude.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(route);
      }
      return route.includes(pattern);
    });
  }

  /**
   * 获取页面优先级
   */
  getRoutePriority(route) {
    if (route === "/") {
      return this.config.sitemap.priority.home;
    }

    if (route.startsWith("/docs/")) {
      return this.config.sitemap.priority.docs;
    }

    return this.config.sitemap.priority.pages;
  }

  /**
   * 获取页面更新频率
   */
  getChangeFreq(route) {
    // 首页更新频率较高
    if (route === "/") {
      return "daily";
    }

    // 文档页面中等频率更新
    if (route.startsWith("/docs/")) {
      return "weekly";
    }

    // 其他页面较少更新
    return "monthly";
  }

  /**
   * 生成单个URL条目
   */
  generateUrlEntry(route, lastModified = null) {
    const url = route === "/" ? "" : route;
    const fullUrl = `${this.config.site.url}${url}`;
    const lastmod = lastModified || new Date().toISOString().split("T")[0];
    const changefreq = this.getChangeFreq(route);
    const priority = this.getRoutePriority(route);

    return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }

  /**
   * 生成完整的sitemap.xml内容
   */
  async generateSitemapXML(routes = null) {
    // 如果没有提供路由列表，自动收集
    if (!routes) {
      routes = await collectPrerenderRoutes();
    }

    // 过滤排除的路由
    const filteredRoutes = routes.filter(
      (route) => !this.shouldExcludeRoute(route)
    );

    console.log(`📋 生成站点地图，包含 ${filteredRoutes.length} 个页面`);

    // 生成URL条目
    const urlEntries = filteredRoutes
      .map((route) => this.generateUrlEntry(route))
      .join("\n");

    // 生成完整的XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;

    return sitemap;
  }

  /**
   * 保存站点地图到文件
   */
  async saveSitemap(sitemap, outputDir = "dist") {
    const sitemapPath = path.join(outputDir, this.config.sitemap.filename);

    // 确保输出目录存在
    await fs.ensureDir(outputDir);

    // 写入文件
    await fs.writeFile(sitemapPath, sitemap, "utf8");

    console.log(`🗺️ 站点地图已生成: ${sitemapPath}`);
    return sitemapPath;
  }

  /**
   * 生成robots.txt文件
   */
  async generateRobotsTxt(outputDir = "dist") {
    const robotsConfig = this.config.robots;

    let robotsContent = "";

    // 用户代理规则
    robotsConfig.userAgents.forEach((userAgent) => {
      robotsContent += `User-agent: ${userAgent}\n`;
      robotsContent += "Allow: /\n";

      // 禁止访问的路径
      robotsConfig.disallow.forEach((path) => {
        robotsContent += `Disallow: ${path}\n`;
      });

      robotsContent += "\n";
    });

    // 爬取延迟
    if (robotsConfig.crawlDelay) {
      robotsContent += `Crawl-delay: ${robotsConfig.crawlDelay}\n\n`;
    }

    // 站点地图位置
    robotsContent += `Sitemap: ${this.config.site.url}/${this.config.sitemap.filename}\n`;

    // 针对特定搜索引擎的优化
    robotsContent += `
# 针对特定搜索引擎的优化
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /`;

    const robotsPath = path.join(outputDir, "robots.txt");
    await fs.writeFile(robotsPath, robotsContent.trim(), "utf8");

    console.log(`🤖 robots.txt已生成: ${robotsPath}`);
    return robotsPath;
  }

  /**
   * 执行完整的SEO文件生成流程
   */
  async generate(outputDir = "dist") {
    try {
      console.log("🚀 开始生成SEO文件...");

      // 生成站点地图
      const sitemap = await this.generateSitemapXML();
      const sitemapPath = await this.saveSitemap(sitemap, outputDir);

      // 生成robots.txt
      const robotsPath = await this.generateRobotsTxt(outputDir);

      console.log("✅ SEO文件生成完成！");

      return {
        sitemap: sitemapPath,
        robots: robotsPath,
      };
    } catch (error) {
      console.error("❌ SEO文件生成失败:", error);
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new SitemapGenerator();

  // 支持命令行参数指定输出目录
  const outputDir = process.argv[2] || "dist";

  generator.generate(outputDir).catch(console.error);
}
