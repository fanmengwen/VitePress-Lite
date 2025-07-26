import request from 'supertest';
import app from '../src/index.js';

// 由于直接使用 JavaScript 版本，我们需要手动初始化 Prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

describe('文章 API', () => {
  let authToken: string;
  let userId: number;
  let testPostSlug: string;

  beforeAll(async () => {
    // 清理测试数据
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();

    // 创建测试用户并获取 token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        name: '测试用户',
        password: '123456'
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/posts', () => {
    it('应该返回空的文章列表', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toEqual([]);
    });
  });

  describe('POST /api/posts', () => {
    it('应该成功创建文章', async () => {
      const postData = {
        title: '测试文章标题',
        content: '这是测试文章的内容',
        excerpt: '测试摘要',
        published: true
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post).toHaveProperty('id');
      expect(response.body.data.post.title).toBe(postData.title);
      expect(response.body.data.post.content).toBe(postData.content);
      expect(response.body.data.post.published).toBe(true);
      expect(response.body.data.post).toHaveProperty('slug');
      expect(response.body.data.post.author.id).toBe(userId);

      testPostSlug = response.body.data.post.slug;
    });

    it('应该拒绝未认证的请求', async () => {
      const postData = {
        title: '无权限文章',
        content: '内容'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '', // 空标题
          content: '' // 空内容
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('GET /api/posts/:slug', () => {
    it('应该返回文章详情', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPostSlug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post).toHaveProperty('id');
      expect(response.body.data.post.slug).toBe(testPostSlug);
      expect(response.body.data.post.title).toBe('测试文章标题');
      expect(response.body.data.post).toHaveProperty('content');
      expect(response.body.data.post.author).toHaveProperty('id');
    });

    it('应该返回 404 对于不存在的文章', async () => {
      const response = await request(app)
        .get('/api/posts/non-existent-slug')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('不存在');
    });
  });

  describe('PUT /api/posts/:slug', () => {
    it('应该成功更新文章', async () => {
      const updateData = {
        title: '更新后的标题',
        content: '更新后的内容',
        published: false
      };

      const response = await request(app)
        .put(`/api/posts/${testPostSlug}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.title).toBe(updateData.title);
      expect(response.body.data.post.content).toBe(updateData.content);
      expect(response.body.data.post.published).toBe(false);
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostSlug}`)
        .send({ title: '新标题' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝其他用户的文章修改', async () => {
      // 创建另一个用户
      const anotherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'another@example.com',
          name: '另一个用户',
          password: '123456'
        });

      const anotherToken = anotherUserResponse.body.data.token;

      const response = await request(app)
        .put(`/api/posts/${testPostSlug}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ title: '恶意修改' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('权限');
    });
  });

  describe('DELETE /api/posts/:slug', () => {
    it('应该成功删除文章', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPostSlug}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('删除');

      // 验证文章已被删除
      const getResponse = await request(app)
        .get(`/api/posts/${testPostSlug}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('应该拒绝删除不存在的文章', async () => {
      const response = await request(app)
        .delete('/api/posts/non-existent-slug')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/posts (集成测试)', () => {
    beforeAll(async () => {
      // 创建多篇测试文章
      const postsData = [
        {
          title: '第一篇文章',
          content: '第一篇文章内容',
          published: true
        },
        {
          title: '第二篇文章',
          content: '第二篇文章内容',
          published: false
        },
        {
          title: '第三篇文章',
          content: '第三篇文章内容',
          published: true
        }
      ];

      for (const postData of postsData) {
        await request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData);
      }
    });

    it('应该只返回已发布的文章', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts.length).toBeGreaterThanOrEqual(2);
      
      // 所有返回的文章都应该是已发布的
      response.body.data.posts.forEach((post: any) => {
        expect(post.published).toBe(true);
      });
    });

    it('应该按创建时间降序排列', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      const posts = response.body.data.posts;
      expect(posts.length).toBeGreaterThanOrEqual(2);

      // 验证排序
      for (let i = 0; i < posts.length - 1; i++) {
        const currentDate = new Date(posts[i].createdAt);
        const nextDate = new Date(posts[i + 1].createdAt);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });
  });
}); 