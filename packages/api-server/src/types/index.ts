export interface User {
  id: number;
  email: string;
  name?: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorId: number;
  author?: User;
}

export interface CreateUserDto {
  email: string;
  name?: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreatePostDto {
  title: string;
  content: string;
  excerpt?: string;
  published?: boolean;
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  excerpt?: string;
  published?: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
}
