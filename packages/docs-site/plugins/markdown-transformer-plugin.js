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
              </div>
              <div class="markdown-body" v-html="html" />
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
              // .replace(new RegExp('\\s+', 'g'), '-') // 空格转横线
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
