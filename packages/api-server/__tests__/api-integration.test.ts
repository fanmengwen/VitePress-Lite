import request from "supertest";
import { PrismaClient } from "@prisma/client";

// 测试服务器地址
const API_BASE = "http://localhost:3001";

describe("API 集成测试", () => {
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // 等待服务器启动
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  describe("健康检查", () => {
    it("应该返回健康状态", async () => {
      const response = await request(API_BASE).get("/health").expect(200);

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
      const response = await request(API_BASE)
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
      const response = await request(API_BASE)
        .post("/api/auth/register")
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("已被注册");
    });

    it("应该成功登录", async () => {
      const response = await request(API_BASE)
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
      const response = await request(API_BASE)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUserId);
      expect(response.body.data.user.email).toBe(testUser.email);
    });
  });

  describe("文章管理", () => {
    let testPostSlug: string;
    const timestamp = Date.now();

    it("应该获取文章列表", async () => {
      const response = await request(API_BASE).get("/api/posts").expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.posts)).toBe(true);
    });

    it("应该成功创建文章", async () => {
      const postData = {
        title: `Integration Test Article ${timestamp}`,
        content: "This is integration test article content",
        excerpt: "Integration test excerpt",
        published: true,
      };

      const response = await request(API_BASE)
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.title).toBe(postData.title);
      expect(response.body.data.post.published).toBe(true);
      expect(response.body.data.post.author.id).toBe(testUserId);

      testPostSlug = response.body.data.post.slug;
    });

    it("应该获取文章详情", async () => {
      const response = await request(API_BASE)
        .get(`/api/posts/${encodeURIComponent(testPostSlug)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.slug).toBe(testPostSlug);
      expect(response.body.data.post.title).toBe(
        `Integration Test Article ${timestamp}`,
      );
    });

    it("应该拒绝未认证的文章创建", async () => {
      const response = await request(API_BASE)
        .post("/api/posts")
        .send({
          title: "无权限文章",
          content: "内容",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
