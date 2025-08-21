// scripts/test-prerender-site.js
import http from "http";

/**
 * 测试预渲染站点是否正常工作
 */
class PrerenderSiteTester {
  constructor(options = {}) {
    this.options = {
      baseUrl: "http://localhost:4173",
      testRoutes: ["/", "/total", "/hmr", "/setting", "/unit/unit1"],
      timeout: 5000,
      ...options,
    };
  }

  /**
   * 发送HTTP请求
   */
  async request(url) {
    return new Promise((resolve, reject) => {
      const req = http.get(url, { timeout: this.options.timeout }, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url,
          });
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Request timeout: ${url}`));
      });
    });
  }

  /**
   * 分析页面内容
   */
  analyzePage(response) {
    const { body, url } = response;

    const analysis = {
      url,
      hasHTML: body.includes("<html"),
      hasTitle: body.includes("<title>"),
      hasCSS: body.includes(".css"),
      hasJS: body.includes(".js"),
      hasContent: body.includes("markdown-content"),
      hasPrerenderFlag: body.includes('data-prerendered="true"'),
      contentLength: body.length,
      title: "",
      errors: [],
    };

    // 提取标题
    const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      analysis.title = titleMatch[1];
    }

    // 检查错误
    if (response.statusCode !== 200) {
      analysis.errors.push(`HTTP ${response.statusCode}`);
    }

    if (!analysis.hasHTML) {
      analysis.errors.push("No HTML structure");
    }

    if (!analysis.hasCSS) {
      analysis.errors.push("No CSS references");
    }

    if (!analysis.hasJS) {
      analysis.errors.push("No JS references");
    }

    if (!analysis.hasContent) {
      analysis.errors.push("No markdown content");
    }

    return analysis;
  }

  /**
   * 测试静态资源
   */
  async testAssets() {
    console.log("🔍 测试静态资源...\n");

    // 动态获取资源文件名
    const assetTests = [];

    // 添加CSS文件
    assetTests.push("/assets/styles-BxwN-q_r.css");

    // 动态查找主JS文件
    try {
      const fs = await import("fs");
      const path = await import("path");
      const assetsDir = "dist-prerender/assets";

      if (fs.existsSync && fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const mainJsFile = files.find(
          (file) => file.startsWith("index-") && file.endsWith(".js")
        );

        if (mainJsFile) {
          assetTests.push(`/assets/${mainJsFile}`);
        }
      }
    } catch (error) {
      console.warn("无法动态检测JS文件，使用静态文件名");
      assetTests.push("/assets/index-Bzt98_k_.js"); // 备用的当前文件名
    }

    const results = [];

    for (const asset of assetTests) {
      try {
        const url = `${this.options.baseUrl}${asset}`;
        const response = await this.request(url);

        const result = {
          asset,
          statusCode: response.statusCode,
          contentType: response.headers["content-type"] || "unknown",
          size: response.body.length,
          success: response.statusCode === 200,
        };

        results.push(result);

        const status = result.success ? "✅" : "❌";
        console.log(`${status} ${asset}`);
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   Type: ${result.contentType}`);
        console.log(`   Size: ${result.size} bytes`);

        if (!result.success) {
          console.log(`   ❌ Failed to load asset`);
        }

        console.log("");
      } catch (error) {
        console.log(`❌ ${asset}`);
        console.log(`   Error: ${error.message}\n`);
        results.push({
          asset,
          error: error.message,
          success: false,
        });
      }
    }

    return results;
  }

  /**
   * 测试所有页面
   */
  async testPages() {
    console.log("🔍 测试页面内容...\n");

    const results = [];

    for (const route of this.options.testRoutes) {
      try {
        const url = `${this.options.baseUrl}${route}`;
        console.log(`📄 测试: ${route} -> ${url}`);

        const response = await this.request(url);
        const analysis = this.analyzePage(response);

        results.push(analysis);

        // 打印结果
        const status = analysis.errors.length === 0 ? "✅" : "❌";
        console.log(`${status} ${route} (${analysis.title})`);
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   Content: ${analysis.contentLength} bytes`);
        console.log(`   HTML: ${analysis.hasHTML ? "✅" : "❌"}`);
        console.log(`   CSS: ${analysis.hasCSS ? "✅" : "❌"}`);
        console.log(`   JS: ${analysis.hasJS ? "✅" : "❌"}`);
        console.log(`   Content: ${analysis.hasContent ? "✅" : "❌"}`);
        console.log(`   Prerender: ${analysis.hasPrerenderFlag ? "✅" : "❌"}`);

        if (analysis.errors.length > 0) {
          console.log(`   Errors: ${analysis.errors.join(", ")}`);
        }

        console.log("");
      } catch (error) {
        console.log(`❌ ${route}`);
        console.log(`   Error: ${error.message}\n`);
        results.push({
          url: route,
          error: error.message,
          errors: [error.message],
        });
      }
    }

    return results;
  }

  /**
   * 等待服务器启动
   */
  async waitForServer(maxAttempts = 10) {
    console.log("⏳ 等待服务器启动...");

    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.request(this.options.baseUrl);
        console.log("✅ 服务器已启动\n");
        return true;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`服务器启动失败: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(pageResults, assetResults) {
    const totalPages = pageResults.length;
    const successfulPages = pageResults.filter(
      (r) => !r.errors || r.errors.length === 0
    ).length;
    const totalAssets = assetResults.length;
    const successfulAssets = assetResults.filter((r) => r.success).length;

    console.log("📊 测试报告");
    console.log("=".repeat(50));
    console.log(`📄 页面测试: ${successfulPages}/${totalPages} 成功`);
    console.log(`📦 资源测试: ${successfulAssets}/${totalAssets} 成功`);

    if (successfulPages === totalPages && successfulAssets === totalAssets) {
      console.log("\n🎉 所有测试通过！预渲染站点工作正常。");
    } else {
      console.log("\n⚠️ 部分测试失败，请检查错误信息。");
    }

    return {
      pages: { total: totalPages, successful: successfulPages },
      assets: { total: totalAssets, successful: successfulAssets },
      success:
        successfulPages === totalPages && successfulAssets === totalAssets,
    };
  }

  /**
   * 运行完整测试
   */
  async runTests() {
    try {
      console.log("🚀 开始测试预渲染站点\n");

      // 等待服务器启动
      await this.waitForServer();

      // 测试静态资源
      const assetResults = await this.testAssets();

      // 测试页面
      const pageResults = await this.testPages();

      // 生成报告
      const report = this.generateReport(pageResults, assetResults);

      return report;
    } catch (error) {
      console.error("❌ 测试失败:", error.message);
      throw error;
    }
  }
}

// 如果直接运行此脚本，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PrerenderSiteTester();
  tester
    .runTests()
    .then((report) => {
      process.exit(report.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
