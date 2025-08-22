import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始播种数据库...");

  // 创建测试用户
  const hashedPassword = await bcrypt.hash("123456", 12);

  const user = await prisma.user.upsert({
    where: { email: "fanmengwen@gmail.com" },
    update: {},
    create: {
      email: "fanmengwen@gmail.com",
      name: "范梦文",
      password: hashedPassword,
    },
  });

  console.log("👤 创建用户:", user.email);

  // 创建测试文章
  const posts = [
    {
      title: "VitePress-Lite 项目介绍",
      content: `一个现代化的文档站点生成器，支持热更新和自动路由生成。`,
      excerpt: "一个现代化的文档站点生成器，支持热更新和自动路由生成。",
      published: false,
    },
  ];

  for (const postData of posts) {
    const slug = postData.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .replace(/^-|-$/g, "");

    const post = await prisma.post.upsert({
      where: { slug },
      update: {},
      create: {
        ...postData,
        slug,
        authorId: user.id,
      },
    });

    console.log("📝 创建文章:", post.title);
  }

  console.log("✅ 数据库播种完成！");
}

main()
  .catch((e) => {
    console.error("❌ 播种失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
