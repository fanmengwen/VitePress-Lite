import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthService } from "../services/authService";
import { validate, registerSchema, loginSchema } from "../utils/validation";
import { asyncHandler } from "../middlewares/errorHandler";

export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: 用户注册
   *     description: 创建新用户账号
   *     tags: [认证]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 用户邮箱
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 minLength: 6
   *                 description: 用户密码（至少6位）
   *                 example: password123
   *               name:
   *                 type: string
   *                 description: 用户姓名（可选）
   *                 example: 张三
   *     responses:
   *       201:
   *         description: 注册成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: 注册成功
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   *                     token:
   *                       type: string
   *                       description: JWT访问令牌
   *       400:
   *         description: 请求参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: 邮箱已存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static register: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validate(registerSchema, req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error },
      });
    }

    const result = await AuthService.register(value!);

    res.status(201).json({
      success: true,
      message: "注册成功",
      data: result,
    });
  });

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: 用户登录
   *     description: 用户邮箱密码登录获取访问令牌
   *     tags: [认证]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 登录邮箱
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 description: 登录密码
   *                 example: password123
   *     responses:
   *       200:
   *         description: 登录成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: 登录成功
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   *                     token:
   *                       type: string
   *                       description: JWT访问令牌
   *       400:
   *         description: 请求参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 邮箱或密码错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static login: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validate(loginSchema, req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error },
      });
    }

    const result = await AuthService.login(value!);

    res.json({
      success: true,
      message: "登录成功",
      data: result,
    });
  });

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: 获取用户资料
   *     description: 获取当前登录用户的个人资料信息
   *     tags: [认证]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 获取用户资料成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   *       401:
   *         description: 未授权访问
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 用户不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static getProfile: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await AuthService.getProfile(userId);

    res.json({
      success: true,
      data: { user: profile },
    });
  });
}
