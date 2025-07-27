import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JwtPayload } from "../types/index";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "") // 保留中文、字母、数字、空格和横线
    .replace(/\s+/g, "-") // 空格替换为横线
    .replace(/-+/g, "-") // 多个横线合并为一个
    .trim() // 去掉首尾空格
    .replace(/^-|-$/g, ""); // 去掉首尾横线
};
