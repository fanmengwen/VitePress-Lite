import { prisma } from "../utils/db";
import { generateSlug } from "../utils/auth";
import { createError } from "../middlewares/errorHandler";
import { CreatePostDto, UpdatePostDto, Post } from "../types/index";

export class PostService {
  static async getAllPosts(includeUnpublished = false) {
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
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts;
  }

  static async getPostBySlug(slug: string) {
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
            email: true,
          },
        },
      },
    });

    if (!post) {
      throw createError("文章不存在", 404);
    }

    return post;
  }

  static async createPost(postData: CreatePostDto, authorId: number) {
    const slug = postData.slug || generateSlug(postData.title);

    // 检查 slug 是否已存在
    const existingPost = await prisma.post.findUnique({
      where: { slug },
    });

    if (existingPost) {
      throw createError("该文章标识符已存在，请修改标题或slug", 409);
    }

    const post = await prisma.post.create({
      data: {
        title: postData.title,
        slug,
        content: postData.content,
        excerpt: postData.excerpt,
        published: postData.published || false,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return post;
  }

  static async updatePost(
    slug: string,
    postData: UpdatePostDto,
    userId: number,
  ) {
    // 查找文章并验证作者权限
    const existingPost = await prisma.post.findUnique({
      where: { slug },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!existingPost) {
      throw createError("文章不存在", 404);
    }

    if (existingPost.authorId !== userId) {
      throw createError("您没有权限修改此文章", 403);
    }

    // 如果修改了标题，需要重新生成 slug
    let newSlug = slug;
    if (postData.title) {
      newSlug = generateSlug(postData.title);

      // 如果新 slug 与原 slug 不同，检查是否已存在
      if (newSlug !== slug) {
        const slugExists = await prisma.post.findUnique({
          where: { slug: newSlug },
        });

        if (slugExists) {
          throw createError("该标题已存在，请修改标题", 409);
        }
      }
    }

    const post = await prisma.post.update({
      where: { slug },
      data: {
        ...(postData.title && { title: postData.title, slug: newSlug }),
        ...(postData.content !== undefined && { content: postData.content }),
        ...(postData.excerpt !== undefined && { excerpt: postData.excerpt }),
        ...(postData.published !== undefined && {
          published: postData.published,
        }),
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
            email: true,
          },
        },
      },
    });

    return post;
  }

  static async deletePost(slug: string, userId: number) {
    // 查找文章并验证作者权限
    const existingPost = await prisma.post.findUnique({
      where: { slug },
      select: {
        id: true,
        authorId: true,
        title: true,
      },
    });

    if (!existingPost) {
      throw createError("文章不存在", 404);
    }

    if (existingPost.authorId !== userId) {
      throw createError("您没有权限删除此文章", 403);
    }

    await prisma.post.delete({
      where: { slug },
    });

    return { message: `文章 "${existingPost.title}" 已删除` };
  }

  static async getUserPosts(userId: number) {
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts;
  }
}
