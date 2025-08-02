import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "服务器内部错误";

  // Prisma 错误处理
  if (err.message.includes("Unique constraint failed")) {
    statusCode = 409;
    if (err.message.includes("email")) {
      message = "该邮箱已被注册";
    } else if (err.message.includes("slug")) {
      message = "该文章标题已存在，请修改标题";
    } else {
      message = "数据冲突，请检查输入内容";
    }
  }

  // JWT 错误处理
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "无效的访问令牌";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "访问令牌已过期";
  }

  // 开发环境下打印错误栈
  if (process.env.NODE_ENV === "development") {
    console.error("错误详情:", err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

export const createError = (
  message: string,
  statusCode: number = 500,
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// 异步错误捕获包装器 - 修复类型定义
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
