// scripts/simple-seo-test.js
import fs from "fs-extra";
import path from "path";

/**
 * 简单的SEO测试工具（不依赖浏览器）
 * 直接分析生成的HTML文件
 */
class SimpleSEOTester {
  constructor(options = {}) {
    this.options = {
      prerenderDir: "dist-prerender",
      testUrls: ["/", "/hmr", "/setting", "/total", "/unit/unit1"],
      ...options,
    };
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
      openGraphCount: 0,
      hasTwitterCard: false,
      twitterCardCount: 0,
      hasStructuredData: false,
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
      seoInfo.openGraphCount = ogMatches.length;
    }

    // 检查Twitter Card标签
    const twitterMatches = html.match(
      /<meta[^>]*name=["']twitter:[^"']*["'][^>]*>/gi
    );
    if (twitterMatches) {
      seoInfo.hasTwitterCard = true;
      seoInfo.twitterCardCount = twitterMatches.length;
    }

    // 检查结构化数据
    const jsonLdMatch = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i
    );
    if (jsonLdMatch) {
      seoInfo.hasStructuredData = true;
    }

    // 检查预渲染标识
    seoInfo.hasPrerendered = html.includes('data-prerendered="true"');

    return seoInfo;
  }

  /**
   * 评估SEO质量分数
   */
  calculateSEOScore(seoInfo) {
    let score = 0;
    let maxScore = 100;

    // 标题 (20分)
    if (seoInfo.hasTitle) {
      score += 15;
      if (seoInfo.title.length >= 10 && seoInfo.title.length <= 60) {
        score += 5;
      }
    }

    // 描述 (20分)
    if (seoInfo.hasDescription) {
      score += 15;
      if (
        seoInfo.description.length >= 50 &&
        seoInfo.description.length <= 160
      ) {
        score += 5;
      }
    }

    // 关键词 (10分)
    if (seoInfo.hasKeywords) {
      score += 10;
    }

    // Open Graph (15分)
    if (seoInfo.hasOpenGraph) {
      score += 10;
      if (seoInfo.openGraphCount >= 4) {
        score += 5;
      }
    }

    // Twitter Card (10分)
    if (seoInfo.hasTwitterCard) {
      score += 10;
    }

    // 结构化数据 (15分)
    if (seoInfo.hasStructuredData) {
      score += 15;
    }

    // 预渲染标识 (10分)
    if (seoInfo.hasPrerendered) {
      score += 10;
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * 生成SEO等级
   */
  getSEOGrade(score) {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C+";
    if (score >= 40) return "C";
    return "D";
  }

  /**
   * 打印SEO信息
   */
  printSEOInfo(url, seoInfo, score, grade) {
    console.log(`\n📄 ${url}`);
    console.log(`📊 SEO评分: ${score}/100 (${grade}级)`);
    console.log(
      `${seoInfo.hasTitle ? "✅" : "❌"} 标题: ${seoInfo.title || "无"} ${seoInfo.title ? `(${seoInfo.title.length}字符)` : ""}`
    );
    console.log(
      `${seoInfo.hasDescription ? "✅" : "❌"} 描述: ${seoInfo.description || "无"} ${seoInfo.description ? `(${seoInfo.description.length}字符)` : ""}`
    );
    console.log(
      `${seoInfo.hasKeywords ? "✅" : "❌"} 关键词: ${seoInfo.keywords || "无"}`
    );
    console.log(
      `${seoInfo.hasOpenGraph ? "✅" : "❌"} Open Graph: ${seoInfo.openGraphCount} 个标签`
    );
    console.log(
      `${seoInfo.hasTwitterCard ? "✅" : "❌"} Twitter Card: ${seoInfo.twitterCardCount} 个标签`
    );
    console.log(
      `${seoInfo.hasStructuredData ? "✅" : "❌"} 结构化数据: ${seoInfo.hasStructuredData ? "已配置" : "未配置"}`
    );
    console.log(
      `${seoInfo.hasPrerendered ? "✅" : "❌"} 预渲染标识: ${seoInfo.hasPrerendered ? "是" : "否"}`
    );
    console.log(`📝 内容长度: ${seoInfo.contentLength} 字符`);
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(url, seoInfo) {
    const recommendations = [];

    if (!seoInfo.hasTitle) {
      recommendations.push("❌ 缺少页面标题");
    } else if (seoInfo.title.length > 60) {
      recommendations.push(
        `⚠️ 标题过长，建议控制在60字符内 (当前${seoInfo.title.length}字符)`
      );
    } else if (seoInfo.title.length < 10) {
      recommendations.push(
        `⚠️ 标题过短，建议至少10字符 (当前${seoInfo.title.length}字符)`
      );
    }

    if (!seoInfo.hasDescription) {
      recommendations.push("❌ 缺少页面描述");
    } else if (seoInfo.description.length > 160) {
      recommendations.push(
        `⚠️ 描述过长，建议控制在160字符内 (当前${seoInfo.description.length}字符)`
      );
    } else if (seoInfo.description.length < 50) {
      recommendations.push(
        `⚠️ 描述过短，建议至少50字符 (当前${seoInfo.description.length}字符)`
      );
    }

    if (!seoInfo.hasKeywords) {
      recommendations.push("❌ 缺少关键词标签");
    }

    if (!seoInfo.hasOpenGraph) {
      recommendations.push("❌ 缺少Open Graph标签，影响社交媒体分享");
    } else if (seoInfo.openGraphCount < 4) {
      recommendations.push(
        "⚠️ Open Graph标签较少，建议至少包含title、description、type、url"
      );
    }

    if (!seoInfo.hasTwitterCard) {
      recommendations.push("❌ 缺少Twitter Card标签");
    }

    if (!seoInfo.hasStructuredData) {
      recommendations.push("❌ 缺少结构化数据，影响搜索结果展示");
    }

    return recommendations;
  }

  /**
   * 测试所有页面的SEO
   */
  async testAll() {
    console.log("🔍 开始SEO质量检测...\n");

    const results = [];
    let totalScore = 0;

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
          console.log(`❌ 文件不存在: ${url} -> ${filePath}`);
          continue;
        }

        // 读取并分析HTML
        const html = await fs.readFile(filePath, "utf8");
        const seoInfo = this.extractSEOFromHTML(html);
        const score = this.calculateSEOScore(seoInfo);
        const grade = this.getSEOGrade(score);

        results.push({
          url,
          seoInfo,
          score,
          grade,
        });

        totalScore += score;

        // 打印结果
        this.printSEOInfo(url, seoInfo, score, grade);

        // 生成建议
        const recommendations = this.generateRecommendations(url, seoInfo);
        if (recommendations.length > 0) {
          console.log("\n💡 优化建议:");
          recommendations.forEach((rec) => console.log(`   ${rec}`));
        }
      } catch (error) {
        console.error(`❌ 测试失败 ${url}:`, error.message);
      }
    }

    // 生成总结报告
    this.generateSummaryReport(results, totalScore);

    return results;
  }

  /**
   * 生成总结报告
   */
  generateSummaryReport(results, totalScore) {
    const avgScore = Math.round(totalScore / results.length);
    const avgGrade = this.getSEOGrade(avgScore);

    console.log("\n" + "=".repeat(50));
    console.log("📊 SEO质量检测报告");
    console.log("=".repeat(50));

    console.log(`📈 总体评分: ${avgScore}/100 (${avgGrade}级)`);
    console.log(`📄 检测页面: ${results.length} 个`);

    // 按等级分布
    const gradeDistribution = {};
    results.forEach((result) => {
      gradeDistribution[result.grade] =
        (gradeDistribution[result.grade] || 0) + 1;
    });

    console.log("\n📋 等级分布:");
    Object.entries(gradeDistribution)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([grade, count]) => {
        console.log(`   ${grade}级: ${count} 个页面`);
      });

    // 最佳和最差页面
    const sortedResults = results.sort((a, b) => b.score - a.score);
    console.log(
      `\n🏆 最佳页面: ${sortedResults[0].url} (${sortedResults[0].score}分)`
    );
    console.log(
      `📉 待优化页面: ${sortedResults[sortedResults.length - 1].url} (${sortedResults[sortedResults.length - 1].score}分)`
    );

    // 整体建议
    console.log("\n🎯 整体优化建议:");
    if (avgScore >= 90) {
      console.log("   ✅ SEO质量excellent！保持当前标准");
    } else if (avgScore >= 80) {
      console.log("   ✅ SEO质量良好，可考虑进一步优化社交媒体标签");
    } else if (avgScore >= 70) {
      console.log("   ⚠️ SEO质量中等，建议完善元数据和结构化数据");
    } else {
      console.log(
        "   ❌ SEO质量需要改进，请优先完善基础标签（title、description）"
      );
    }

    console.log("\n📁 详细报告已保存到: dist-prerender/seo-report-simple.json");
  }

  /**
   * 保存报告到文件
   */
  async saveReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: results.length,
        averageScore: Math.round(
          results.reduce((sum, r) => sum + r.score, 0) / results.length
        ),
      },
      details: results,
    };

    const reportPath = path.join(
      this.options.prerenderDir,
      "seo-report-simple.json"
    );
    await fs.writeJson(reportPath, report, { spaces: 2 });
  }
}

// 如果直接运行此脚本，执行SEO测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SimpleSEOTester();
  tester
    .testAll()
    .then((results) => tester.saveReport(results))
    .catch(console.error);
}
