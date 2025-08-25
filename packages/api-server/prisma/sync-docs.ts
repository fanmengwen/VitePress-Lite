import { PrismaClient } from "@prisma/client";
import glob from "fast-glob";
import matter from "gray-matter";
import { promises as fs } from "fs";
import { resolve, relative } from "path";
import { generateSlug } from "../src/utils/auth.js";

const prisma = new PrismaClient();

interface FrontmatterData {
  title?: string;
  author?: string;
  date?: string;
  tags?: string[];
  published?: boolean;
  excerpt?: string;
}

interface SyncResult {
  totalFiles: number;
  created: number;
  updated: number;
  errors: string[];
}

/**
 * 从文件路径生成slug
 * 优先使用相对路径，确保slug唯一性和可读性
 */
function generateSlugFromPath(filePath: string): string {
  // 移除 docs/ 前缀和 .md 后缀，保留路径结构
  const relativePath = filePath
    .replace(/^.*\/docs\//, "") // 移除到docs目录的路径
    .replace(/\.md$/, ""); // 移除.md扩展名

  // 对路径进行清理，保持层级结构但确保URL安全
  return relativePath
    .toLowerCase()
    .replace(/\s+/g, "-") // 空格转横线
    .replace(/[^a-z0-9\u4e00-\u9fa5\/\-]/g, "") // 只保留字母、数字、中文、斜杠、横线
    .replace(/\/+/g, "/") // 多个斜杠合并
    .replace(/\-+/g, "-") // 多个横线合并
    .replace(/^\/|\/$/g, "") // 移除首尾斜杠
    .replace(/^-|-$/g, ""); // 移除首尾横线
}

/**
 * 生成文章摘要
 * 从内容中提取前150字符作为摘要
 */
function generateExcerpt(content: string, frontmatterExcerpt?: string): string {
  if (frontmatterExcerpt) {
    return frontmatterExcerpt;
  }

  // 移除Markdown语法，提取纯文本
  const plainText = content
    .replace(/^#+ /gm, "") // 移除标题标记
    .replace(/\*\*(.*?)\*\*/g, "$1") // 移除粗体标记
    .replace(/\*(.*?)\*/g, "$1") // 移除斜体标记
    .replace(/`(.*?)`/g, "$1") // 移除行内代码标记
    .replace(/```[\s\S]*?```/g, "") // 移除代码块
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 移除链接，保留文本
    .replace(/\n+/g, " ") // 换行转空格
    .trim();

  return plainText.length > 150
    ? plainText.substring(0, 150) + "..."
    : plainText;
}

/**
 * 获取默认作者信息
 * 首先尝试从数据库获取第一个用户，如果没有则创建默认用户
 */
async function getDefaultAuthor() {
  let author = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!author) {
    // 如果没有用户，创建一个默认用户
    console.log("📝 未找到用户，创建默认同步用户...");
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("sync-default-password", 12);

    author = await prisma.user.create({
      data: {
        email: "docs-sync@system.local",
        name: "文档同步系统",
        password: hashedPassword,
      },
    });
    console.log("✅ 默认用户创建成功:", author.email);
  }

  return author;
}

/**
 * 同步单个Markdown文件到数据库
 */
async function syncMarkdownFile(
  filePath: string,
  defaultAuthor: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📄 处理文件: ${filePath}`);

    // 读取文件内容
    const fileContent = await fs.readFile(filePath, "utf-8");

    // 解析frontmatter和内容
    const { data: frontmatter, content } = matter(fileContent) as {
      data: FrontmatterData;
      content: string;
    };

    // 生成slug
    const slug = generateSlugFromPath(filePath);

    // 提取标题（优先使用frontmatter，其次使用第一个标题，最后使用文件名）
    let title = frontmatter.title;
    if (!title) {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      title = titleMatch
        ? titleMatch[1].trim()
        : relative(process.cwd(), filePath).replace(/\.md$/, "");
    }

    // 生成摘要
    const excerpt = generateExcerpt(content, frontmatter.excerpt);

    // 确定发布状态
    const published =
      frontmatter.published !== undefined ? frontmatter.published : true;

    // 处理作者信息
    let authorId = defaultAuthor.id;
    if (frontmatter.author) {
      // 尝试根据作者名称或邮箱查找用户
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ name: frontmatter.author }, { email: frontmatter.author }],
        },
      });
      if (existingUser) {
        authorId = existingUser.id;
      }
    }

    // 处理创建时间（优先使用frontmatter.date，否则使用当前时间）
    let createdAt = new Date();
    if (frontmatter.date) {
      try {
        const parsedDate = new Date(frontmatter.date);
        // 验证日期是否有效
        if (!isNaN(parsedDate.getTime())) {
          createdAt = parsedDate;
        } else {
          console.warn(`⚠️  无效的日期格式: ${frontmatter.date}，使用当前时间`);
        }
      } catch (error) {
        console.warn(`⚠️  解析日期失败: ${frontmatter.date}，使用当前时间`);
      }
    }

    // 使用upsert确保幂等性
    const post = await prisma.post.upsert({
      where: { slug },
      update: {
        title,
        content,
        excerpt,
        published,
        authorId,
        updatedAt: new Date(),
      },
      create: {
        title,
        slug,
        content,
        excerpt,
        published,
        authorId,
        createdAt,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        createdAt: true,
      },
    });

    console.log(
      `✅ ${post.id ? "更新" : "创建"}文章: ${post.title} (${post.slug})${frontmatter.date ? ` [创建时间: ${createdAt.toISOString().split('T')[0]}]` : ''}`,
    );
    return { success: true };
  } catch (error) {
    const errorMessage = `处理文件 ${filePath} 时出错: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`❌ ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * 主同步函数
 */
async function syncDocsToDatabase(): Promise<SyncResult> {
  console.log("🚀 开始同步文档到数据库...");

  const result: SyncResult = {
    totalFiles: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  try {
    // 扫描docs目录下的所有Markdown文件
    const docsPath = resolve(process.cwd(), "../../docs");
    const pattern = `${docsPath}/**/*.md`;

    console.log(`📂 扫描目录: ${docsPath}`);
    const markdownFiles = await glob(pattern, {
      absolute: true,
      ignore: ["**/node_modules/**"],
    });

    result.totalFiles = markdownFiles.length;
    console.log(`📊 找到 ${result.totalFiles} 个Markdown文件`);

    if (result.totalFiles === 0) {
      console.log("⚠️  未找到任何Markdown文件");
      return result;
    }

    // 获取默认作者
    const defaultAuthor = await getDefaultAuthor();

    // 记录同步前的文章数量
    const existingPostsCount = await prisma.post.count();

    // 同步每个文件
    for (const filePath of markdownFiles) {
      const syncResult = await syncMarkdownFile(filePath, defaultAuthor);

      if (!syncResult.success && syncResult.error) {
        result.errors.push(syncResult.error);
      }
    }

    // 计算创建和更新的数量
    const finalPostsCount = await prisma.post.count();
    result.created = Math.max(0, finalPostsCount - existingPostsCount);
    result.updated = result.totalFiles - result.created;

    // 输出汇总信息
    console.log("\n📈 同步完成汇总:");
    console.log(`   📁 处理文件: ${result.totalFiles}`);
    console.log(`   ✨ 新建文章: ${result.created}`);
    console.log(`   🔄 更新文章: ${result.updated}`);
    console.log(`   ❌ 错误数量: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("\n⚠️  错误详情:");
      result.errors.forEach((error) => console.log(`   - ${error}`));
    }

    console.log("\n🎉 文档同步完成！");
  } catch (error) {
    const errorMessage = `同步过程中发生致命错误: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`💥 ${errorMessage}`);
    result.errors.push(errorMessage);
  }

  return result;
}

/**
 * 主执行函数
 */
async function main() {
  try {
    const result = await syncDocsToDatabase();

    // 根据结果确定退出码
    const exitCode = result.errors.length > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error("💥 同步脚本执行失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { syncDocsToDatabase, generateSlugFromPath, generateExcerpt };
