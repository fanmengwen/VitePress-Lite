import Joi from "joi";
import {
  CreateUserDto,
  LoginDto,
  CreatePostDto,
  UpdatePostDto,
} from "../types/index";

export const registerSchema = Joi.object<CreateUserDto>({
  email: Joi.string().email().required().messages({
    "string.email": "请输入有效的邮箱地址",
    "any.required": "邮箱是必填项",
  }),
  name: Joi.string().optional().allow(""),
  password: Joi.string().min(6).required().messages({
    "string.min": "密码至少需要6个字符",
    "any.required": "密码是必填项",
  }),
});

export const loginSchema = Joi.object<LoginDto>({
  email: Joi.string().email().required().messages({
    "string.email": "请输入有效的邮箱地址",
    "any.required": "邮箱是必填项",
  }),
  password: Joi.string().required().messages({
    "any.required": "密码是必填项",
  }),
});

export const createPostSchema = Joi.object<CreatePostDto>({
  title: Joi.string().required().messages({
    "any.required": "标题是必填项",
  }),
  slug: Joi.string().optional(),
  content: Joi.string().required().messages({
    "any.required": "内容是必填项",
  }),
  excerpt: Joi.string().optional().allow(""),
  published: Joi.boolean().optional().default(false),
});

export const updatePostSchema = Joi.object<UpdatePostDto>({
  title: Joi.string().optional(),
  slug: Joi.string().optional(),
  content: Joi.string().optional(),
  excerpt: Joi.string().optional().allow(""),
  published: Joi.boolean().optional(),
});

export const validate = <T>(
  schema: Joi.ObjectSchema<T>,
  data: any,
): { error?: string; value?: T } => {
  const { error, value } = schema.validate(data, { stripUnknown: true });

  if (error) {
    return { error: error.details[0].message };
  }

  return { value };
};
