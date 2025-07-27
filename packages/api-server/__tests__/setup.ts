// 测试环境设置
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./test.db";
process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";

// 增加测试超时时间
jest.setTimeout(30000);
