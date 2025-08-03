// plugins/markdown-transformer-plugin.js
/**
 *
 * @param {Object} options
 * @param {Object} options.markdownItOptions markdown-it 配置
 * @param {Array} options.markdownItPlugins markdown-it 插件
 * @returns
 */
import MarkdownIt from "markdown-it";
import matter from "gray-matter";
import fs from "node:fs";

export default function markdownTransformerPlugin(options = {}) {
  const { markdownItOptions = {}, markdownItPlugins = [] } = options;

  const md = new MarkdownIt(markdownItOptions);

  for (const plugin of markdownItPlugins) {
    if (Array.isArray(plugin)) {
      md.use(...plugin);
    } else {
      md.use(plugin);
    }
  }

  return {
    name: "markdown-transformer-plugin",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".md")) {
        return null;
      }

      // 1. 解析 markdown 文件
      const { content, data: frontmatter } = matter(code);

      // 2. 使用 markdown-it 处理 markdown 文件
      const html = md.render(content);

      // 3. 将所有信息拼接成一个 Vue SFC 字符串，增强动态数据支持
      const vueSFC = `
      <template>
        <div class="markdown-page">
          <GlobalNav />
          
          <!-- 文章元数据头部 -->
          <div v-if="postData && !isLoading" class="article-header">
            <div class="article-meta">
              <h1 class="article-title">{{ postData.title }}</h1>
              <div class="article-info">
                <span class="created-date">📅 {{ formatDate(postData.createdAt) }}</span>
                <span class="updated-date">🔄 {{ formatDate(postData.updatedAt) }}</span>
                <span class="published-status" :class="{ published: postData.published }">
                  {{ postData.published ? '✅ 已发布' : '📝 草稿' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Loading状态 -->
          <div v-if="isLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>正在加载文章数据...</p>
          </div>

          <!-- 错误状态 -->
          <div v-if="error" class="error-container">
            <p class="error-message">⚠️ {{ error }}</p>
            <button @click="retryFetch" class="retry-button">重试</button>
          </div>

          <!-- 主要内容区域 -->
          <div class="content-container">
            <!-- 静态Markdown内容 (来自文件) -->
            <div class="static-content">
              <div class="content-separator">
                <h3>📄 静态内容 (来自.md文件)</h3>
              </div>
              <div class="markdown-body" v-html="html" />
            </div>

            <!-- 动态Markdown内容 (来自数据库) -->
            <div v-if="postData && postData.content" class="api-content">
              <div class="content-separator">
                <h3>📡 动态内容 (来自数据库)</h3>
              </div>
              <div class="markdown-body api-markdown" v-html="renderMarkdown(postData.content)" />
            </div>
          </div>
      
          <!-- 文章底部信息 -->
          <div v-if="postData && !isLoading" class="article-footer">
            <div class="article-stats">
              <span class="slug">🔗 Slug: {{ postData.slug }}</span>
              <span class="id">🆔 ID: {{ postData.id }}</span>
            </div>
          </div>
        </div>
      </template>

      <script>
        import { ref, onMounted, computed } from 'vue';
        import GlobalNav from '@/components/common/GlobalNav.vue';
        import { api } from '@/api';

        export default {
          components: {
              GlobalNav // 注册 GlobalNav 组件
          },
         setup() {
          const initialData = {
            frontmatter: ${JSON.stringify(frontmatter)},
            html: ${JSON.stringify(html)}
          };
          
          const frontmatter = ref(initialData.frontmatter);
          const html = ref(initialData.html);
          
          // 动态文章数据
          const postData = ref(null);
          const isLoading = ref(false);
          const error = ref(null);

          // 从路径中提取slug，与同步脚本保持一致
          const extractSlugFromPath = () => {
            const path = "${id}";
            // 移除docs路径前缀和.md后缀，保留目录结构
            const relativePath = path
              .replace(new RegExp('^.*/docs/', ''), '') // 移除到docs目录的路径
              .replace(new RegExp('\\.md$', ''), ''); // 移除.md扩展名
            
            // 生成与sync-docs.ts一致的slug
            return relativePath
              .toLowerCase()
              .replace(new RegExp('\\s+', 'g'), '-') // 空格转横线
              .replace(new RegExp('[^a-z0-9\\u4e00-\\u9fa5/-]', 'g'), '') // 只保留字母、数字、中文、斜杠、横线
              .replace(new RegExp('/+', 'g'), '/') // 多个斜杠合并
              .replace(new RegExp('-+', 'g'), '-') // 多个横线合并
              .replace(new RegExp('^/|/$', ''), '') // 移除首尾斜杠
              .replace(new RegExp('^-|-$', ''), ''); // 移除首尾横线
          };

          const fetchPostData = async () => {
            const slug = extractSlugFromPath();
            if (!slug) return;

            isLoading.value = true;
            error.value = null;

            try {
              const response = await api.getPost(slug);
              if (response.success && response.data) {
                postData.value = response.data.post;
              }
            } catch (err) {
              console.warn('Could not fetch dynamic post data:', err);
              error.value = '无法获取动态文章数据';
            } finally {
              isLoading.value = false;
            }
          };

          const retryFetch = () => {
            fetchPostData();
          };

          // 格式化日期
          const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          };

          // 渲染Markdown内容 (简单的换行处理)
          const renderMarkdown = (content) => {
            if (!content) return '';
            // 简单的Markdown渲染: 将换行符转换为HTML
            return content
              .replace(new RegExp('\\n\\n', 'g'), '</p><p>')  // 段落
              .replace(new RegExp('\\n', 'g'), '<br>')        // 换行
              .replace(new RegExp('^'), '<p>')            // 开始标签
              .replace(new RegExp('$'), '</p>')           // 结束标签
              .replace(new RegExp('<p></p>', 'g'), '');      // 清理空段落
          };

          // 组件挂载时尝试获取动态数据
          onMounted(() => {
            fetchPostData();
          });

           // HMR 客户端逻辑, 当文件发生变化时，更新页面
           // 否则 md 文件变化不在 vite 中触发，只会触发 ws ，但是不会触发 HMR
            if (import.meta.hot) {
              import.meta.hot.on('markdown-update', (data) => {
                // 当接收到自定义事件时，检查文件路径是否匹配
                if (data.file === "${id}") {
                  console.log('HMR update received for:', data.file);
                  frontmatter.value = data.frontmatter;
                  html.value = data.html;
                  // 重新获取动态数据
                  fetchPostData();
                }
              });
            }

            return {
              frontmatter,
              html,
              postData,
              isLoading,
              error,
              retryFetch,
              formatDate,
              renderMarkdown
            }
         },
        }
      </script>

      <style scoped>
      /* 文章头部样式 */
      .article-header {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 10px;
        border-left: 4px solid #007acc;
      }

      .article-title {
        margin: 0 0 1rem 0;
        color: #2c3e50;
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .article-info {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.9rem;
        color: #666;
      }

      .article-info span {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 15px;
        font-weight: 500;
      }

      .published-status.published {
        color: #27ae60;
        background: rgba(39, 174, 96, 0.1);
      }

      /* Loading和错误状态 */
      .loading-container, .error-container {
        text-align: center;
        padding: 2rem;
        margin: 1rem 0;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e0e0e0;
        border-top: 3px solid #007acc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .error-message {
        color: #e74c3c;
        margin-bottom: 1rem;
      }

      .retry-button {
        background: #007acc;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .retry-button:hover {
        background: #005fa3;
      }

      /* 文章底部样式 */
      .article-footer {
        margin-top: 3rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border-top: 2px solid #e9ecef;
      }

      .article-stats {
        display: flex;
        gap: 1rem;
        font-size: 0.85rem;
        color: #666;
        flex-wrap: wrap;
      }

      .article-stats span {
        padding: 0.25rem 0.5rem;
        background: white;
        border-radius: 12px;
        font-family: 'Monaco', 'Consolas', monospace;
      }

      /* 内容容器样式 */
      .content-container {
        margin: 2rem 0;
      }

      .static-content {
        margin-bottom: 2rem;
      }

      /* 内容区域样式 */
      .markdown-body {
        line-height: 1.8;
        color: #333;
        font-size: 16px;
        margin: 1rem 0;
      }

      .markdown-body h1, .markdown-body h2, .markdown-body h3 {
        color: #2c3e50;
        margin-top: 2rem;
        margin-bottom: 1rem;
      }

      .markdown-body p {
        margin-bottom: 1rem;
      }

      .markdown-body pre {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
        margin: 1rem 0;
      }

      .markdown-body code {
        background: #f1f3f4;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-family: 'Monaco', 'Consolas', monospace;
      }

      /* 动态内容区域样式 */
      .api-content {
        margin-top: 3rem;
        border-top: 2px solid #e9ecef;
        padding-top: 2rem;
      }

      .content-separator {
        margin-bottom: 2rem;
        text-align: center;
      }

      .content-separator h3 {
        color: #007acc;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 0.8rem 1.5rem;
        border-radius: 20px;
        display: inline-block;
        margin: 0;
        font-size: 1.1rem;
        box-shadow: 0 2px 8px rgba(0,122,204,0.1);
      }

      .api-markdown {
        background: #fafbfc;
        padding: 2rem;
        border-radius: 12px;
        border-left: 4px solid #007acc;
      }

      /* 响应式设计 */
      @media (max-width: 768px) {
        .article-title {
          font-size: 1.5rem;
        }
        
        .article-info {
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .article-stats {
          flex-direction: column;
          gap: 0.5rem;
        }

        .markdown-body {
          font-size: 15px;
        }

        .api-markdown {
          padding: 1rem;
        }

        .content-separator h3 {
          font-size: 1rem;
          padding: 0.6rem 1.2rem;
        }
      }
      </style>
    `;

      return {
        code: vueSFC,
        map: null, // sourcemap 在此暂不处理
      };
    },
    async handleHotUpdate({ file, server }) {
      if (!file.endsWith(".md")) return;
      const code = await fs.promises.readFile(file, "utf-8");

      // 3. 重新解析
      const { data: frontmatter, content } = matter(code);
      const html = md.render(content);

      // 4. 发送自定义事件到客户端
      server.ws.send({
        type: "custom",
        event: "markdown-update", // 自定义事件名
        data: {
          file,
          frontmatter,
          html,
        },
      });

      // 5. 告诉 Vite 不需要整页刷新
      return [];
    },
  };
}
