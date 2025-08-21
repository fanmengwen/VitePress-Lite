// scripts/generate-api-fallbacks.js
import fs from "fs-extra";
import path from "path";

/**
 * 为静态站点生成API降级响应
 * 创建虚拟的API端点文件，返回适当的静态响应
 */
class ApiFallbackGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: "dist-prerender",
      ...options,
    };
  }

  /**
   * 生成健康检查响应
   */
  async generateHealthEndpoint() {
    const healthResponse = {
      success: true,
      message: "Static site - no backend services",
      data: {
        status: "static",
        timestamp: new Date().toISOString(),
        environment: "prerendered",
        services: {
          api: "disabled",
          database: "disabled",
          cache: "disabled",
        },
      },
    };

    const healthDir = path.join(this.options.outputDir, "health");
    await fs.ensureDir(healthDir);

    // 创建 index.html 文件返回JSON响应
    const healthHtml = this.generateJsonResponseHtml(
      healthResponse,
      "Health Check"
    );
    await fs.writeFile(path.join(healthDir, "index.html"), healthHtml, "utf8");

    console.log("✅ 已生成 /health 降级响应");
  }

  /**
   * 生成Posts API响应
   */
  async generatePostsEndpoint() {
    const postsResponse = {
      success: true,
      message: "Static site - posts data not available",
      data: {
        posts: [],
        total: 0,
        message: "This is a static site. Dynamic content is not available.",
      },
    };

    const apiDir = path.join(this.options.outputDir, "api");
    const postsDir = path.join(apiDir, "posts");
    await fs.ensureDir(postsDir);

    // 创建 /api/posts/index.html
    const postsHtml = this.generateJsonResponseHtml(postsResponse, "Posts API");
    await fs.writeFile(path.join(postsDir, "index.html"), postsHtml, "utf8");

    console.log("✅ 已生成 /api/posts 降级响应");
  }

  /**
   * 生成特定Post API响应
   */
  async generateSpecificPostEndpoints() {
    const specificRoutes = [
      "unit/unit1",
      "unit/unit2",
      "unit/unit3",
      "total",
      "hmr",
      "setting",
    ];

    for (const route of specificRoutes) {
      const postResponse = {
        success: false,
        message: "Post not found in static site",
        error: "not_found",
        data: {
          message:
            "This is a static site. Individual post data is embedded in the page HTML.",
          suggestion: `Visit /${route} to see the content`,
          redirect: `/${route}`,
        },
      };

      const postDir = path.join(this.options.outputDir, "api", "posts", route);
      await fs.ensureDir(postDir);

      const postHtml = this.generateJsonResponseHtml(
        postResponse,
        `Post: ${route}`,
        404
      );
      await fs.writeFile(path.join(postDir, "index.html"), postHtml, "utf8");
    }

    console.log("✅ 已生成特定Post API降级响应");
  }

  /**
   * 生成通用API响应页面
   */
  generateJsonResponseHtml(data, title, statusCode = 200) {
    const statusText =
      statusCode === 200 ? "OK" : statusCode === 404 ? "Not Found" : "Error";

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Static API Response</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f8f9fa;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .status-200 { background: #d4edda; color: #155724; }
    .status-404 { background: #f8d7da; color: #721c24; }
    .json-response {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 20px;
      font-family: 'Monaco', 'Menlo', monospace;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    .info {
      background: #d1ecf1;
      border: 1px solid #bee5eb;
      border-radius: 4px;
      padding: 15px;
      margin-top: 20px;
    }
    .info h3 {
      margin-top: 0;
      color: #0c5460;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📄 ${title}</h1>
    <span class="status status-${statusCode}">HTTP ${statusCode} ${statusText}</span>
    
    <h2>API 响应</h2>
    <div class="json-response">${JSON.stringify(data, null, 2)}</div>
    
    <div class="info">
      <h3>ℹ️ 静态站点说明</h3>
      <p>这是一个预渲染的静态站点。API端点已被降级处理：</p>
      <ul>
        <li>📄 <strong>内容数据</strong>：已预渲染到HTML页面中</li>
        <li>🚫 <strong>动态API</strong>：在静态环境中不可用</li>
        <li>🔄 <strong>交互功能</strong>：通过前端JavaScript实现</li>
      </ul>
      <p>如需访问实际内容，请直接访问相应的页面路径。</p>
    </div>
  </div>

  <script>
    // 设置响应头信息（仅用于调试）
    console.log('📄 Static API Response:', {
      url: window.location.href,
      status: ${statusCode},
      response: ${JSON.stringify(data)}
    });
    
    // 如果是404且有重定向建议，3秒后自动跳转
    ${
      statusCode === 404 && data.data?.redirect
        ? `
    setTimeout(() => {
      if (confirm('页面未找到，是否跳转到实际内容页面？')) {
        window.location.href = '${data.data.redirect}';
      }
    }, 3000);
    `
        : ""
    }
  </script>
</body>
</html>`;
  }

  /**
   * 生成所有API降级响应
   */
  async generateAllFallbacks() {
    console.log("🚀 开始生成API降级响应...\n");

    try {
      await this.generateHealthEndpoint();
      await this.generatePostsEndpoint();
      await this.generateSpecificPostEndpoints();

      console.log("\n🎉 API降级响应生成完成！");
      console.log("📁 输出目录:", this.options.outputDir);

      // 生成报告
      this.generateReport();
    } catch (error) {
      console.error("❌ 生成失败:", error);
      throw error;
    }
  }

  /**
   * 生成降级响应报告
   */
  generateReport() {
    console.log("\n📋 生成的API端点:");
    console.log("===============================");
    console.log("✅ /health - 健康检查降级");
    console.log("✅ /api/posts - Posts列表降级");
    console.log("✅ /api/posts/unit/unit1 - 特定Post降级");
    console.log("✅ /api/posts/unit/unit2 - 特定Post降级");
    console.log("✅ /api/posts/unit/unit3 - 特定Post降级");
    console.log("✅ /api/posts/total - 特定Post降级");
    console.log("✅ /api/posts/hmr - 特定Post降级");
    console.log("✅ /api/posts/setting - 特定Post降级");

    console.log("\n💡 说明:");
    console.log("- API端点返回静态响应，说明当前为静态站点");
    console.log("- 404响应包含友好的错误信息和跳转建议");
    console.log("- 所有响应都是有效的HTML页面，便于调试");
  }
}

// 如果直接运行此脚本，生成API降级响应
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ApiFallbackGenerator({
    outputDir: "dist-prerender",
  });

  generator.generateAllFallbacks().catch(console.error);
}
