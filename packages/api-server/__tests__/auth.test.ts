import request from 'supertest';
import app from '../src/index.js';

// 由于直接使用 JavaScript 版本，我们需要手动初始化 Prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

describe('认证 API', () => {
  beforeAll(async () => {
    // 清理测试数据
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        email: 'newuser@test.com',
        name: '新用户',
        password: '123456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('应该拒绝重复的邮箱', async () => {
      const userData = {
        email: 'newuser@test.com', // 已存在的邮箱
        name: '另一个用户',
        password: '123456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('已被注册');
    });

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email', // 无效邮箱
          password: '123' // 密码太短
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录', async () => {
      const loginData = {
        email: 'newuser@test.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data).toHaveProperty('token');
    });

    it('应该拒绝错误的密码', async () => {
      const loginData = {
        email: 'newuser@test.com',
        password: 'wrong-password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('密码错误');
    });

    it('应该拒绝不存在的用户', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('密码错误');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;

    beforeAll(async () => {
      // 登录获取 token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@test.com',
          password: '123456'
        });

      authToken = loginResponse.body.data.token;
    });

    it('应该返回用户信息', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('newuser@test.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('应该拒绝无效的 token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝缺失的 token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
}); 