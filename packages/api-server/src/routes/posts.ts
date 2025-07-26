import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { PostController } from '../controllers/postController';
import { authenticateToken } from '../middlewares/auth';

export const postRoutes: RouterType = Router();

// 公共路由（无需认证）
postRoutes.get('/', PostController.getAllPosts);
postRoutes.get('/:slug', PostController.getPostBySlug);

// 受保护路由（需要认证）
postRoutes.post('/', authenticateToken, PostController.createPost);
postRoutes.put('/:slug', authenticateToken, PostController.updatePost);
postRoutes.delete('/:slug', authenticateToken, PostController.deletePost);
postRoutes.get('/user/my-posts', authenticateToken, PostController.getUserPosts); 