import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/index";

const prisma = new PrismaClient();

describe("API 集成测试", () => {
  let authToken: string;
  let testUserId: number;

  // 测试前清理
  beforeAll(async () => {
    try {
      await prisma.post.deleteMany({});
      await prisma.user.deleteMany({});
    } catch (error) {
      // 忽略清理错误
    }
  });

  // 测试后清理
  afterAll(async () => {
    try {
      await prisma.post.deleteMany({});
      await prisma.user.deleteMany({});
    } catch (error) {
      // 忽略清理错误
    } finally {
      await prisma.$disconnect();
    }
  });

  describe("健康检查", () => {
    it("应该返回健康状态", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("ok");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("用户认证", () => {
    const timestamp = Date.now();
    const testUser = {
      email: `integration-${timestamp}@test.com`,
      name: "集成测试用户",
      password: "123456",
    };

    it("应该成功注册新用户", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data).toHaveProperty("token");

      authToken = response.body.data.token;
      testUserId = response.body.data.user.id;
    });

    it("应该拒绝重复邮箱注册", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("已被注册");
    });

    it("应该成功登录", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data).toHaveProperty("token");
    });

    it("应该获取用户信息", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUserId);
    });
  });

  describe("文章管理", () => {
    let testPostSlug: string;

    it("应该获取文章列表", async () => {
      const response = await request(app).get("/api/posts").expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.posts)).toBe(true);
    });

    it("应该成功创建文章", async () => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const postData = {
        title: `集成测试文章-${uniqueId}`,
        slug: `integration-test-${uniqueId}`,
        content: "这是集成测试的文章内容",
        excerpt: "集成测试摘要",
        published: true,
      };

      const response = await request(app)
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.title).toBe(postData.title);
      expect(response.body.data.post.slug).toBe(postData.slug);

      // 使用实际返回的slug
      testPostSlug = response.body.data.post.slug;
    });

    it("应该获取文章详情", async () => {
      const response = await request(app)
        .get(`/api/posts/${encodeURIComponent(testPostSlug)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.slug).toBe(testPostSlug);
    });

    it("应该拒绝未认证的文章创建", async () => {
      const postData = {
        title: "未认证测试文章",
        slug: "unauthorized-test",
        content: "这应该失败",
        published: true,
      };

      const response = await request(app)
        .post("/api/posts")
        .send(postData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
