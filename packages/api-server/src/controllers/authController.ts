import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { validate, registerSchema, loginSchema } from '../utils/validation';
import { asyncHandler } from '../middlewares/errorHandler';

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validate(registerSchema, req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error }
      });
    }

    const result = await AuthService.register(value!);
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: result
    });
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = validate(loginSchema, req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error }
      });
    }

    const result = await AuthService.login(value!);
    
    res.json({
      success: true,
      message: '登录成功',
      data: result
    });
  });

  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await AuthService.getProfile(userId);
    
    res.json({
      success: true,
      data: { user: profile }
    });
  });
} 