import { Router } from "express";
import type { Router as RouterType } from "express";
import { AuthController } from "../controllers/authController";
import { authenticateToken } from "../middlewares/auth";

export const authRoutes: RouterType = Router();

// 公共路由（无需认证）
authRoutes.post("/register", AuthController.register);
authRoutes.post("/login", AuthController.login);

// 受保护路由（需要认证）
authRoutes.get("/profile", authenticateToken, AuthController.getProfile);
