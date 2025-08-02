import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VitePress-Lite API',
      version: '1.0.0',
      description: '基于 Node.js + Express + Prisma 的现代化 API 服务，为文档站点提供用户认证和内容管理功能',
      contact: {
        name: 'API Support',
        email: 'support@vitepress-lite.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: '开发环境'
      },
      {
        url: 'https://api.vitepress-lite.com/api',
        description: '生产环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 认证令牌'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '用户唯一标识符'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '用户邮箱地址'
            },
            name: {
              type: 'string',
              nullable: true,
              description: '用户名称'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        Post: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '文章唯一标识符'
            },
            title: {
              type: 'string',
              description: '文章标题'
            },
            slug: {
              type: 'string',
              description: '文章URL别名'
            },
            content: {
              type: 'string',
              description: 'Markdown格式的文章内容'
            },
            excerpt: {
              type: 'string',
              nullable: true,
              description: '文章摘要'
            },
            published: {
              type: 'boolean',
              description: '文章发布状态'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            },
            author: {
              $ref: '#/components/schemas/User'
            },
            authorId: {
              type: 'integer',
              description: '作者用户ID'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: '错误信息'
            },
            message: {
              type: 'string',
              description: '详细错误描述'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP状态码'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // 扫描包含JSDoc注释的文件
};

export const specs = swaggerJsdoc(options);
export const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'VitePress-Lite API 文档'
};

export { swaggerUi }; 