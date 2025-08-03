import { Router } from "express";
import type { Router as RouterType } from "express";
import { PostController } from "../controllers/postController";
import { authenticateToken } from "../middlewares/auth";

export const postRoutes: RouterType = Router();

// 受保护路由（需要认证）- 放在前面避免被通配符路由匹配
postRoutes.post("/", authenticateToken, PostController.createPost);
postRoutes.get(
  "/user/my-posts",
  authenticateToken,
  PostController.getUserPosts,
);

// 公共路由（无需认证）
postRoutes.get("/", PostController.getAllPosts);

// 支持包含斜杠的slug - 使用通配符路由，必须放在最后
postRoutes.get("/*", PostController.getPostBySlug);
postRoutes.put("/*", authenticateToken, PostController.updatePost);
postRoutes.delete("/*", authenticateToken, PostController.deletePost);
