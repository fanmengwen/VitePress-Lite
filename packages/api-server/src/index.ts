import express from "express";
import type { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRoutes } from "./routes/auth";
import { postRoutes } from "./routes/posts";
import { errorHandler } from "./middlewares/errorHandler";

// 加载环境变量
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

// 健康检查端点 - 放在API路径下保持一致性
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 兼容性：保留原有的健康检查端点
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 API 服务器已启动在 http://localhost:${PORT}`);
});

export default app;
