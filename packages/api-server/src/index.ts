import express from "express";
import type { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRoutes } from "./routes/auth";
import { postRoutes } from "./routes/posts";
import { errorHandler } from "./middlewares/errorHandler";
import { specs, swaggerUi, swaggerUiOptions } from "./config/swagger";

// 加载环境变量
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// API 文档路由 (在其他路由之前)
const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
if (swaggerEnabled) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // API 文档重定向
  app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });
}

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

// 健康检查端点 - 放在API路径下保持一致性
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_PROVIDER || 'sqlite',
    swagger: swaggerEnabled
  });
});

// 兼容性：保留原有的健康检查端点
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_PROVIDER || 'sqlite',
    swagger: swaggerEnabled
  });
});

// 根路径信息
app.get("/", (req, res) => {
  res.json({
    name: "VitePress-Lite API",
    version: "1.0.0",
    description: "基于 Node.js + Express + Prisma 的现代化 API 服务",
    endpoints: {
      health: "/api/health",
      docs: swaggerEnabled ? "/api-docs" : null,
      auth: "/api/auth",
      posts: "/api/posts"
    }
  });
});

// 错误处理中间件
app.use(errorHandler);

// 仅在非测试环境下启动服务器
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 API 服务器已启动在 http://localhost:${PORT}`);
    console.log(`💾 数据库: ${process.env.DATABASE_PROVIDER || 'SQLite'}`);
    if (swaggerEnabled) {
      console.log(`📚 API 文档: http://localhost:${PORT}/api-docs`);
    }
  });
}

export default app;
