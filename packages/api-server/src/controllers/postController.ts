import { Request, Response, RequestHandler } from "express";
import { PostService } from "../services/postService";
import {
  validate,
  createPostSchema,
  updatePostSchema,
} from "../utils/validation";
import { asyncHandler } from "../middlewares/errorHandler";

export class PostController {
  /**
   * @swagger
   * /posts:
   *   get:
   *     summary: 获取所有文章
   *     description: 获取所有已发布的文章列表，可选择包含未发布文章
   *     tags: [文章管理]
   *     security: []
   *     parameters:
   *       - in: query
   *         name: includeUnpublished
   *         schema:
   *           type: boolean
   *           default: false
   *         description: 是否包含未发布的文章
   *         example: false
   *     responses:
   *       200:
   *         description: 获取文章列表成功
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
   *                     posts:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Post'
   */
  static getAllPosts: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const includeUnpublished = req.query.includeUnpublished === "true";
    const posts = await PostService.getAllPosts(includeUnpublished);

    res.json({
      success: true,
      data: { posts },
    });
  });

  /**
   * @swagger
   * /posts/{slug}:
   *   get:
   *     summary: 根据slug获取文章
   *     description: 通过文章的slug标识符获取特定文章详情
   *     tags: [文章管理]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *         description: 文章的URL别名
   *         example: my-first-post
   *     responses:
   *       200:
   *         description: 获取文章成功
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
   *                     post:
   *                       $ref: '#/components/schemas/Post'
   *       404:
   *         description: 文章不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static getPostBySlug: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    // 支持包含斜杠的slug - 通配符路由将参数放在params[0]中
    const slug = req.params["0"] || req.params.slug;
    const post = await PostService.getPostBySlug(slug);

    res.json({
      success: true,
      data: { post },
    });
  });

  /**
   * @swagger
   * /posts:
   *   post:
   *     summary: 创建新文章
   *     description: 创建一篇新的文章（需要认证）
   *     tags: [文章管理]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - slug
   *               - content
   *             properties:
   *               title:
   *                 type: string
   *                 description: 文章标题
   *                 example: 我的第一篇文章
   *               slug:
   *                 type: string
   *                 description: 文章URL别名
   *                 example: my-first-post
   *               content:
   *                 type: string
   *                 description: 文章内容（Markdown格式）
   *                 example: |
   *                   # 标题
   *                   
   *                   这是我的第一篇文章内容。
   *               excerpt:
   *                 type: string
   *                 description: 文章摘要（可选）
   *                 example: 这是一篇关于如何开始写作的文章
   *               published:
   *                 type: boolean
   *                 description: 是否发布文章
   *                 default: false
   *                 example: true
   *     responses:
   *       201:
   *         description: 文章创建成功
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
   *                   example: 文章创建成功
   *                 data:
   *                   type: object
   *                   properties:
   *                     post:
   *                       $ref: '#/components/schemas/Post'
   *       400:
   *         description: 请求参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未授权访问
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: 文章slug已存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static createPost: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validate(createPostSchema, req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error },
      });
    }

    const authorId = req.user!.id;
    const post = await PostService.createPost(value!, authorId);

    res.status(201).json({
      success: true,
      message: "文章创建成功",
      data: { post },
    });
  });

  /**
   * @swagger
   * /posts/{slug}:
   *   put:
   *     summary: 更新文章
   *     description: 更新指定slug的文章内容（需要认证且为文章作者）
   *     tags: [文章管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *         description: 文章的URL别名
   *         example: my-first-post
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 description: 文章标题
   *                 example: 更新后的文章标题
   *               slug:
   *                 type: string
   *                 description: 文章URL别名
   *                 example: updated-post-slug
   *               content:
   *                 type: string
   *                 description: 文章内容（Markdown格式）
   *                 example: 更新后的文章内容
   *               excerpt:
   *                 type: string
   *                 description: 文章摘要
   *                 example: 更新后的文章摘要
   *               published:
   *                 type: boolean
   *                 description: 是否发布文章
   *                 example: true
   *     responses:
   *       200:
   *         description: 文章更新成功
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
   *                   example: 文章更新成功
   *                 data:
   *                   type: object
   *                   properties:
   *                     post:
   *                       $ref: '#/components/schemas/Post'
   *       400:
   *         description: 请求参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未授权访问
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 无权限修改此文章
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 文章不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static updatePost: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    // 支持包含斜杠的slug - 通配符路由将参数放在params[0]中
    const slug = req.params["0"] || req.params.slug;
    const { error, value } = validate(updatePostSchema, req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error },
      });
    }

    const userId = req.user!.id;
    const post = await PostService.updatePost(slug, value!, userId);

    res.json({
      success: true,
      message: "文章更新成功",
      data: { post },
    });
  });

  /**
   * @swagger
   * /posts/{slug}:
   *   delete:
   *     summary: 删除文章
   *     description: 删除指定slug的文章（需要认证且为文章作者）
   *     tags: [文章管理]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *         description: 文章的URL别名
   *         example: my-first-post
   *     responses:
   *       200:
   *         description: 文章删除成功
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
   *                   example: 文章删除成功
   *       401:
   *         description: 未授权访问
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 无权限删除此文章
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 文章不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static deletePost: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    // 支持包含斜杠的slug - 通配符路由将参数放在params[0]中
    const slug = req.params["0"] || req.params.slug;
    const userId = req.user!.id;
    const result = await PostService.deletePost(slug, userId);

    res.json({
      success: true,
      message: result.message,
    });
  });

  /**
   * @swagger
   * /posts/user/me:
   *   get:
   *     summary: 获取当前用户的文章
   *     description: 获取当前登录用户创建的所有文章
   *     tags: [文章管理]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 获取用户文章成功
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
   *                     posts:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Post'
   *       401:
   *         description: 未授权访问
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static getUserPosts: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const posts = await PostService.getUserPosts(userId);

    res.json({
      success: true,
      data: { posts },
    });
  });
}
