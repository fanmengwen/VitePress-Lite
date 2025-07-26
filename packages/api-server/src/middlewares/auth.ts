import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { createError } from './errorHandler';
import { AuthUser } from '../types/index';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw createError('访问令牌缺失', 401);
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email
    };
    next();
  } catch (error) {
    next(error);
  }
}; 