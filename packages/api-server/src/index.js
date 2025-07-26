import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 初始化 Prisma
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// 中间件
app.use(cors());
app.use(express.json());

// 工具函数
const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '');
};

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw createError('访问令牌缺失', 401);
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email
    };
    next();
  } catch (error) {
    next(error);
  }
};

// 验证 schema
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱是必填项'
  }),
  name: Joi.string().optional().allow(''),
  password: Joi.string().min(6).required().messages({
    'string.min': '密码至少需要6个字符',
    'any.required': '密码是必填项'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱是必填项'
  }),
  password: Joi.string().required().messages({
    'any.required': '密码是必填项'
  })
});

const createPostSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': '标题是必填项'
  }),
  content: Joi.string().required().messages({
    'any.required': '内容是必填项'
  }),
  excerpt: Joi.string().optional().allow(''),
  published: Joi.boolean().optional().default(false)
});

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { stripUnknown: true });
  
  if (error) {
    return { error: error.details[0].message };
  }
  
  return { value };
};

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 认证路由
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { error, value } = validate(registerSchema, req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: { message: error }
    });
  }

  // 检查邮箱是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { email: value.email }
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: { message: '该邮箱已被注册' }
    });
  }

  // 哈希密码
  const hashedPassword = await hashPassword(value.password);

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email: value.email,
      name: value.name,
      password: hashedPassword
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true
    }
  });

  // 生成 JWT 令牌
  const token = generateToken({
    userId: user.id,
    email: user.email
  });

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: { user, token }
  });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { error, value } = validate(loginSchema, req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: { message: error }
    });
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email: value.email }
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { message: '邮箱或密码错误' }
    });
  }

  // 验证密码
  const isValidPassword = await comparePassword(value.password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: { message: '邮箱或密码错误' }
    });
  }

  // 生成 JWT 令牌
  const token = generateToken({
    userId: user.id,
    email: user.email
  });

  res.json({
    success: true,
    message: '登录成功',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      token
    }
  });
}));

app.get('/api/auth/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { message: '用户不存在' }
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// 文章路由
app.get('/api/posts', asyncHandler(async (req, res) => {
  const includeUnpublished = req.query.includeUnpublished === 'true';
  const posts = await prisma.post.findMany({
    where: includeUnpublished ? {} : { published: true },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({
    success: true,
    data: { posts }
  });
}));

app.get('/api/posts/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!post) {
    return res.status(404).json({
      success: false,
      error: { message: '文章不存在' }
    });
  }

  res.json({
    success: true,
    data: { post }
  });
}));

app.post('/api/posts', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = validate(createPostSchema, req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: { message: error }
    });
  }

  const slug = generateSlug(value.title);
  
  // 检查 slug 是否已存在
  const existingPost = await prisma.post.findUnique({
    where: { slug }
  });

  if (existingPost) {
    return res.status(409).json({
      success: false,
      error: { message: '该标题已存在，请修改标题' }
    });
  }

  const post = await prisma.post.create({
    data: {
      title: value.title,
      slug,
      content: value.content,
      excerpt: value.excerpt,
      published: value.published !== undefined ? value.published : false,
      authorId: req.user.id
    },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: '文章创建成功',
    data: { post }
  });
}));

// 错误处理中间件
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';

  // Prisma 错误处理
  if (err.message.includes('Unique constraint failed')) {
    statusCode = 409;
    if (err.message.includes('email')) {
      message = '该邮箱已被注册';
    } else if (err.message.includes('slug')) {
      message = '该文章标题已存在，请修改标题';
    } else {
      message = '数据冲突，请检查输入内容';
    }
  }

  // JWT 错误处理
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的访问令牌';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '访问令牌已过期';
  }

  // 开发环境下打印错误栈
  if (process.env.NODE_ENV === 'development') {
    console.error('错误详情:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 优雅关闭
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 API 服务器已启动在 http://localhost:${PORT}`);
});

export default app; 