// scripts/test-seo.js
import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";

/**
 * SEO测试工具
 * 验证预渲染页面的SEO效果
 */
class SEOTester {
  constructor(options = {}) {
    this.options = {
      prerenderDir: "dist-prerender",
      testUrls: ["/", "/docs/total", "/docs/setting", "/docs/hmr"],
      ...options,
    };
  }

  /**
   * 测试静态HTML文件的SEO信息
   */
  async testStaticHTML() {
    console.log("🔍 测试静态HTML文件的SEO信息...\n");

    const results = [];

    for (const url of this.options.testUrls) {
      try {
        // 确定HTML文件路径
        let filePath;
        if (url === "/") {
          filePath = path.join(this.options.prerenderDir, "index.html");
        } else {
          const routePath = url.startsWith("/") ? url.slice(1) : url;
          filePath = path.join(
            this.options.prerenderDir,
            routePath,
            "index.html"
          );
        }

        if (!(await fs.pathExists(filePath))) {
          console.log(`❌ 文件不存在: ${filePath}`);
          continue;
        }

        // 读取HTML内容
        const html = await fs.readFile(filePath, "utf8");

        // 提取SEO信息
        const seoInfo = this.extractSEOFromHTML(html);

        results.push({
          url,
          filePath,
          ...seoInfo,
        });

        // 打印结果
        this.printSEOInfo(url, seoInfo);
      } catch (error) {
        console.error(`❌ 测试失败 ${url}:`, error.message);
      }
    }

    return results;
  }

  /**
   * 从HTML中提取SEO信息
   */
  extractSEOFromHTML(html) {
    const seoInfo = {
      hasTitle: false,
      title: "",
      hasDescription: false,
      description: "",
      hasKeywords: false,
      keywords: "",
      hasOpenGraph: false,
      openGraphTags: [],
      hasTwitterCard: false,
      twitterTags: [],
      hasStructuredData: false,
      structuredData: [],
      hasPrerendered: false,
      contentLength: html.length,
    };

    // 检查标题
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      seoInfo.hasTitle = true;
      seoInfo.title = titleMatch[1].trim();
    }

    // 检查描述
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i
    );
    if (descMatch) {
      seoInfo.hasDescription = true;
      seoInfo.description = descMatch[1];
    }

    // 检查关键词
    const keywordsMatch = html.match(
      /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)/i
    );
    if (keywordsMatch) {
      seoInfo.hasKeywords = true;
      seoInfo.keywords = keywordsMatch[1];
    }

    // 检查Open Graph标签
    const ogMatches = html.match(
      /<meta[^>]*property=["']og:[^"']*["'][^>]*>/gi
    );
    if (ogMatches) {
      seoInfo.hasOpenGraph = true;
      seoInfo.openGraphTags = ogMatches;
    }

    // 检查Twitter Card标签
    const twitterMatches = html.match(
      /<meta[^>]*name=["']twitter:[^"']*["'][^>]*>/gi
    );
    if (twitterMatches) {
      seoInfo.hasTwitterCard = true;
      seoInfo.twitterTags = twitterMatches;
    }

    // 检查结构化数据
    const jsonLdMatches = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]*)<\/script>/gi
    );
    if (jsonLdMatches) {
      seoInfo.hasStructuredData = true;
      seoInfo.structuredData = jsonLdMatches;
    }

    // 检查是否为预渲染页面
    seoInfo.hasPrerendered = html.includes('data-prerendered="true"');

    return seoInfo;
  }

  /**
   * 打印SEO信息
   */
  printSEOInfo(url, seoInfo) {
    console.log(`📄 URL: ${url}`);
    console.log(
      `${seoInfo.hasTitle ? "✅" : "❌"} 标题: ${seoInfo.title || "无"}`
    );
    console.log(
      `${seoInfo.hasDescription ? "✅" : "❌"} 描述: ${seoInfo.description || "无"}`
    );
    console.log(
      `${seoInfo.hasKeywords ? "✅" : "❌"} 关键词: ${seoInfo.keywords || "无"}`
    );
    console.log(
      `${seoInfo.hasOpenGraph ? "✅" : "❌"} Open Graph: ${seoInfo.openGraphTags.length} 个标签`
    );
    console.log(
      `${seoInfo.hasTwitterCard ? "✅" : "❌"} Twitter Card: ${seoInfo.twitterTags.length} 个标签`
    );
    console.log(
      `${seoInfo.hasStructuredData ? "✅" : "❌"} 结构化数据: ${seoInfo.structuredData.length} 个`
    );
    console.log(
      `${seoInfo.hasPrerendered ? "✅" : "❌"} 预渲染标识: ${seoInfo.hasPrerendered ? "是" : "否"}`
    );
    console.log(`📊 内容长度: ${seoInfo.contentLength} 字符`);
    console.log("---");
  }

  /**
   * 使用Puppeteer测试爬虫视角
   */
  async testWithCrawler() {
    console.log("\n🤖 使用爬虫视角测试...\n");

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // 模拟搜索引擎爬虫
    await page.setUserAgent(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    );

    const results = [];

    for (const url of this.options.testUrls) {
      try {
        // 构建本地文件URL
        const filePath =
          url === "/"
            ? path.resolve(this.options.prerenderDir, "index.html")
            : path.resolve(
                this.options.prerenderDir,
                url.slice(1),
                "index.html"
              );

        if (!(await fs.pathExists(filePath))) {
          console.log(`❌ 文件不存在: ${filePath}`);
          continue;
        }

        const fileUrl = `file://${filePath}`;

        console.log(`🕷️ 爬取: ${url} -> ${fileUrl}`);

        await page.goto(fileUrl, { waitUntil: "networkidle0" });

        // 提取页面信息
        const pageInfo = await page.evaluate(() => {
          return {
            title: document.title,
            description:
              document.querySelector('meta[name="description"]')?.content || "",
            keywords:
              document.querySelector('meta[name="keywords"]')?.content || "",
            h1Count: document.querySelectorAll("h1").length,
            h2Count: document.querySelectorAll("h2").length,
            linkCount: document.querySelectorAll("a").length,
            imageCount: document.querySelectorAll("img").length,
            textLength: document.body?.textContent?.length || 0,
          };
        });

        results.push({ url, ...pageInfo });

        console.log(`✅ 标题: ${pageInfo.title}`);
        console.log(`📝 文本长度: ${pageInfo.textLength} 字符`);
        console.log(`🔗 链接数: ${pageInfo.linkCount}`);
        console.log(`🖼️ 图片数: ${pageInfo.imageCount}`);
        console.log("---");
      } catch (error) {
        console.error(`❌ 爬取失败 ${url}:`, error.message);
      }
    }

    await browser.close();
    return results;
  }

  /**
   * 生成SEO测试报告
   */
  async generateReport() {
    console.log("📊 生成SEO测试报告...\n");

    const staticResults = await this.testStaticHTML();
    const crawlerResults = await this.testWithCrawler();

    // 生成报告
    const report = {
      timestamp: new Date().toISOString(),
      staticHTMLTests: staticResults,
      crawlerTests: crawlerResults,
      summary: this.generateSummary(staticResults, crawlerResults),
    };

    // 保存报告
    const reportPath = path.join(this.options.prerenderDir, "seo-report.json");
    await fs.writeJson(reportPath, report, { spaces: 2 });

    console.log(`📋 SEO报告已保存到: ${reportPath}`);
    console.log("\n📈 总结:");
    console.log(report.summary);

    return report;
  }

  /**
   * 生成测试总结
   */
  generateSummary(staticResults, crawlerResults) {
    const totalPages = staticResults.length;
    const pagesWithTitle = staticResults.filter((r) => r.hasTitle).length;
    const pagesWithDescription = staticResults.filter(
      (r) => r.hasDescription
    ).length;
    const pagesWithOG = staticResults.filter((r) => r.hasOpenGraph).length;
    const prerenderPages = staticResults.filter((r) => r.hasPrerendered).length;

    return {
      totalPages,
      seoCompleteness: {
        title: `${pagesWithTitle}/${totalPages} (${Math.round((pagesWithTitle / totalPages) * 100)}%)`,
        description: `${pagesWithDescription}/${totalPages} (${Math.round((pagesWithDescription / totalPages) * 100)}%)`,
        openGraph: `${pagesWithOG}/${totalPages} (${Math.round((pagesWithOG / totalPages) * 100)}%)`,
        prerendered: `${prerenderPages}/${totalPages} (${Math.round((prerenderPages / totalPages) * 100)}%)`,
      },
      recommendations: this.generateRecommendations(staticResults),
    };
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(results) {
    const recommendations = [];

    results.forEach((result) => {
      if (!result.hasTitle) {
        recommendations.push(`${result.url}: 缺少页面标题`);
      }
      if (!result.hasDescription) {
        recommendations.push(`${result.url}: 缺少页面描述`);
      }
      if (!result.hasOpenGraph) {
        recommendations.push(`${result.url}: 缺少Open Graph标签`);
      }
      if (result.title && result.title.length > 60) {
        recommendations.push(
          `${result.url}: 标题过长 (${result.title.length}字符)`
        );
      }
      if (result.description && result.description.length > 160) {
        recommendations.push(
          `${result.url}: 描述过长 (${result.description.length}字符)`
        );
      }
    });

    return recommendations;
  }
}

// 如果直接运行此脚本，执行SEO测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SEOTester();
  tester.generateReport().catch(console.error);
}
