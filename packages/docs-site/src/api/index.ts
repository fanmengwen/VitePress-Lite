import axios from "axios";

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// User Types
export interface User {
  id: number;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Post Types
export interface Post {
  id: number;
  title: string;
  content: string;
  slug: string;
  excerpt?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name?: string;
    email: string;
  };
}

export interface CreatePostRequest {
  title: string;
  content: string;
  published?: boolean;
}

// API Client Class
class ApiClient {
  private client: any;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: any) => {
        if (this.token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response?.status === 401) {
          this.clearToken();
          // Optionally redirect to login
        }
        return Promise.reject(error);
      },
    );

    // Load token from localStorage on initialization
    this.loadToken();
  }

  // Token management
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  private loadToken(): void {
    const token = localStorage.getItem("auth_token");
    if (token) {
      this.token = token;
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await this.client.get("/health");
    return response.data;
  }

  // Authentication methods
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post("/auth/register", data);
    if (response.data.success && response.data.data.token) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post("/auth/login", data);
    if (response.data.success && response.data.data.token) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.client.get("/auth/profile");
    return response.data;
  }

  async logout(): Promise<void> {
    this.clearToken();
    // Optionally call backend logout endpoint if it exists
  }

  // Posts methods
  async getPosts(): Promise<ApiResponse<{ posts: Post[] }>> {
    const response = await this.client.get("/posts");
    return response.data;
  }

  async getPost(slug: string): Promise<ApiResponse<Post>> {
    const response = await this.client.get(`/posts/${slug}`);
    return response.data;
  }

  async createPost(data: CreatePostRequest): Promise<ApiResponse<Post>> {
    const response = await this.client.post("/posts", data);
    return response.data;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual methods for convenience
export const api = {
  // Health
  healthCheck: () => apiClient.healthCheck(),

  // Auth
  register: (data: RegisterRequest) => apiClient.register(data),
  login: (data: LoginRequest) => apiClient.login(data),
  logout: () => apiClient.logout(),
  getProfile: () => apiClient.getProfile(),
  isAuthenticated: () => apiClient.isAuthenticated(),

  // Posts
  getPosts: () => apiClient.getPosts(),
  getPost: (slug: string) => apiClient.getPost(slug),
  createPost: (data: CreatePostRequest) => apiClient.createPost(data),
};

export default apiClient;
