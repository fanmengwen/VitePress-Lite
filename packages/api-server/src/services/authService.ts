import { prisma } from '../utils/db';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { createError } from '../middlewares/errorHandler';
import { CreateUserDto, LoginDto, AuthUser } from '../types/index';

export class AuthService {
  static async register(userData: CreateUserDto) {
    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw createError('该邮箱已被注册', 409);
    }

    // 哈希密码
    const hashedPassword = await hashPassword(userData.password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    // 生成 JWT 令牌
    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    return {
      user,
      token
    };
  }

  static async login(loginData: LoginDto) {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: loginData.email }
    });

    if (!user) {
      throw createError('邮箱或密码错误', 401);
    }

    // 验证密码
    const isValidPassword = await comparePassword(loginData.password, user.password);

    if (!isValidPassword) {
      throw createError('邮箱或密码错误', 401);
    }

    // 生成 JWT 令牌
    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      token
    };
  }

  static async getProfile(userId: number): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      throw createError('用户不存在', 404);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined
    };
  }
} 