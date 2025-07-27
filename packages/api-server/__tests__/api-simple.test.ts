import request from "supertest";

// 测试服务器地址
const API_BASE = "http://localhost:3001";

describe("API 简化测试", () => {
  const randomId = Date.now();
  const testUser = {
    email: `test-${randomId}@example.com`,
    name: `Test User ${randomId}`,
    password: "123456",
  };

  let authToken: string;

  beforeAll(async () => {
    // 等待服务器启动
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it("健康检查应该正常", async () => {
    const response = await request(API_BASE).get("/health").expect(200);

    expect(response.body.status).toBe("ok");
  });

  it("应该成功注册用户", async () => {
    const response = await request(API_BASE)
      .post("/api/auth/register")
      .send(testUser)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(testUser.email);
    expect(response.body.data).toHaveProperty("token");

    authToken = response.body.data.token;
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
    expect(response.body.data).toHaveProperty("token");
  });

  it("应该获取用户信息", async () => {
    const response = await request(API_BASE)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(testUser.email);
  });

  it("应该获取文章列表", async () => {
    const response = await request(API_BASE).get("/api/posts").expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.posts)).toBe(true);
  });

  it("应该成功创建文章", async () => {
    const postData = {
      title: `Test Article ${randomId}`,
      content: `Test content for article ${randomId}`,
      excerpt: "Test excerpt",
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
  });
});
