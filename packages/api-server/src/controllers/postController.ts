import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { validate, createPostSchema, updatePostSchema } from '../utils/validation';
import { asyncHandler } from '../middlewares/errorHandler';

export class PostController {
  static getAllPosts = asyncHandler(async (req: Request, res: Response) => {
    const includeUnpublished = req.query.includeUnpublished === 'true';
    const posts = await PostService.getAllPosts(includeUnpublished);
    
    res.json({
      success: true,
      data: { posts }
    });
  });

  static getPostBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const post = await PostService.getPostBySlug(slug);
    
    res.json({
      success: true,
      data: { post }
    });
  });

  static createPost = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validate(createPostSchema, req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error }
      });
    }

    const authorId = req.user!.id;
    const post = await PostService.createPost(value!, authorId);
    
    res.status(201).json({
      success: true,
      message: '文章创建成功',
      data: { post }
    });
  });

  static updatePost = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { error, value } = validate(updatePostSchema, req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error }
      });
    }

    const userId = req.user!.id;
    const post = await PostService.updatePost(slug, value!, userId);
    
    res.json({
      success: true,
      message: '文章更新成功',
      data: { post }
    });
  });

  static deletePost = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const userId = req.user!.id;
    const result = await PostService.deletePost(slug, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  });

  static getUserPosts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const posts = await PostService.getUserPosts(userId);
    
    res.json({
      success: true,
      data: { posts }
    });
  });
} 