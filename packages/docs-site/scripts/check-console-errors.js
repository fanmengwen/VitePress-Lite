// scripts/check-console-errors.js
import puppeteer from "puppeteer";

/**
 * 检查浏览器控制台错误
 */
class ConsoleErrorChecker {
  constructor(options = {}) {
    this.options = {
      baseUrl: "http://localhost:4173",
      testRoutes: ["/", "/total", "/hmr"],
      timeout: 10000,
      ...options,
    };
  }

  async checkPageConsole(url) {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const logs = [];
    const errors = [];

    // 监听控制台消息
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();

      logs.push({ type, text });

      if (type === "error") {
        errors.push(text);
      }
    });

    // 监听页面错误
    page.on("pageerror", (error) => {
      errors.push(`Page Error: ${error.message}`);
    });

    // 监听请求失败
    page.on("requestfailed", (request) => {
      errors.push(
        `Request Failed: ${request.url()} - ${request.failure().errorText}`
      );
    });

    try {
      console.log(`📄 检查页面: ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: this.options.timeout,
      });

      // 等待Vue应用水合
      await page.waitForTimeout(3000);

      // 检查页面是否正常渲染
      const hasContent = (await page.$(".markdown-content")) !== null;
      const title = await page.title();

      console.log(`   标题: ${title}`);
      console.log(`   内容: ${hasContent ? "✅" : "❌"}`);
      console.log(`   控制台消息: ${logs.length} 条`);
      console.log(`   错误: ${errors.length} 个`);

      // 显示控制台信息
      if (logs.length > 0) {
        console.log("   消息详情:");
        logs.forEach((log) => {
          const emoji = {
            error: "❌",
            warn: "⚠️",
            info: "ℹ️",
            log: "📝",
          };
          console.log(`     ${emoji[log.type] || "📝"} ${log.text}`);
        });
      }

      if (errors.length > 0) {
        console.log("   ❌ 发现错误:");
        errors.forEach((error) => {
          console.log(`     - ${error}`);
        });
      } else {
        console.log("   ✅ 无错误");
      }

      console.log("");

      return {
        url,
        title,
        hasContent,
        logs,
        errors,
        success: errors.length === 0,
      };
    } finally {
      await browser.close();
    }
  }

  async checkAllPages() {
    console.log("🔍 检查浏览器控制台错误...\n");

    const results = [];

    for (const route of this.options.testRoutes) {
      const url = `${this.options.baseUrl}${route}`;
      const result = await this.checkPageConsole(url);
      results.push(result);
    }

    // 生成总结
    const totalPages = results.length;
    const successfulPages = results.filter((r) => r.success).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log("📊 控制台错误检查报告");
    console.log("=".repeat(50));
    console.log(`📄 测试页面: ${totalPages} 个`);
    console.log(`✅ 无错误页面: ${successfulPages} 个`);
    console.log(`❌ 总错误数: ${totalErrors} 个`);

    if (totalErrors === 0) {
      console.log("\n🎉 所有页面控制台无错误！");
    } else {
      console.log("\n⚠️ 发现控制台错误，请检查上述详情。");
    }

    return {
      totalPages,
      successfulPages,
      totalErrors,
      results,
    };
  }
}

// 如果直接运行此脚本，执行检查
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new ConsoleErrorChecker();
  checker
    .checkAllPages()
    .then((report) => {
      process.exit(report.totalErrors === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ 检查失败:", error);
      process.exit(1);
    });
}
