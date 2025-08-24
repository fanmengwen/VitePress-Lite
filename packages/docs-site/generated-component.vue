
      <template>
        <DocumentLayout>
          <div class="markdown-page">
          
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
        </DocumentLayout>
      </template>

      <script>
        import { ref, onMounted, computed } from 'vue';
        import DocumentLayout from '@/components/DocumentLayout.vue';
        import { api } from '@/api';

        export default {
          components: {
              DocumentLayout // 注册 DocumentLayout 组件
          },
         setup() {
          const initialData = {
            frontmatter: {"title":"【与 webpack 差异】","author":"mengwen","date":"2025-01-01","published":true,"excerpt":"Vite 会在服务端维护一张模块依赖图（ModuleGraph），缓存所有模块间的依赖关系。"},
            html: "<h2>与 webpack 差异</h2>\n<p>（1）构建原理： Webpack 是一个静态模块打包器，通过对项目中的 JavaScript、CSS、图片等文件进行分析，生成对应的静态资源，并且可以通过一些插件和加载器来实现各种功能；Vite 则是一种基于浏览器原生 ES 模块解析的构建工具。</p>\n<p>（2）打包速度： Webpack 的打包速度相对较慢，Vite 的打包速度非常快。</p>\n<p>（3）配置难度： Webpack 的配置比较复杂，因为它需要通过各种插件和加载器来实现各种功能；Vite 的配置相对简单，它可以根据不同的开发场景自动配置相应的环境变量和配置选项。</p>\n<p>（4）插件和加载器： Webpack 有大量的插件和加载器可以使用，可以实现各种复杂的构建场景，例如代码分割、按需加载、CSS 预处理器等；Vite 的插件和加载器相对较少</p>\n<p>（5）Vite 是按需加载，webpack 是全部加载： 在 HMR（热更新）方面，当改动了一个模块后，vite 仅需让浏览器重新请求该模块即可，不像 webpack 那样需要把该模块的相关依赖模块全部编译一次，效率更高。</p>\n<p>（6）webpack 是先打包再启动开发服务器，vite 是直接启动开发服务器，然后按需编译依赖文件 由于 vite 在启动的时候不需要打包，也就意味着不需要分析模块的依赖、不需要编译，因此启动速度非常快。当浏览器请求某个模块时，再根据需要对模块内容进行编译，这种按需动态编译的方式，极大的缩减了编译时间。</p>\n<h2>缓存</h2>\n<h3>模块图（ModuleGraph）缓存（内存）</h3>\n<p>Vite 会在服务端维护一张模块依赖图（ModuleGraph），缓存所有模块间的依赖关系。</p>\n<p>✅ 缓存每个模块的 URL、文件路径、导入者、被导入者；</p>\n<p>✅ 当前模块是否启用了 import.meta.hot.accept()；</p>\n<h3>浏览器侧缓存</h3>\n<p>Vite dev server 会给模块加上 Cache-Control: no-cache 和 ETag</p>\n<p>浏览器会用 ETag 判断是否要重拉模块</p>\n<p>热更新时，Vite 会给模块加上 ?t=时间戳 参数强制刷新缓存</p>\n"
          };
          
          const frontmatter = ref(initialData.frontmatter);
          const html = ref(initialData.html);
          
          // 动态文章数据
          const postData = ref(null);
          const isLoading = ref(false);
          const error = ref(null);

          // 从路径中提取slug，与同步脚本保持一致
          const extractSlugFromPath = () => {
            const path = "/Users/fanmw/Desktop/study/VitePress-Lite/docs/01-getting-started/unit2.md";
            // 移除docs路径前缀和.md后缀，保留目录结构
            const relativePath = path
              .replace(new RegExp('^.*/docs/', ''), '') // 移除到docs目录的路径
              .replace(new RegExp('\.md$', ''), ''); // 移除.md扩展名
            
            // 生成与sync-docs.ts一致的slug
            return relativePath
              .toLowerCase()
              // .replace(new RegExp('\s+', 'g'), '-') // 空格转横线
              .replace(new RegExp('[^a-z0-9\u4e00-\u9fa5/-]', 'g'), '') // 只保留字母、数字、中文、斜杠、横线
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
              .replace(new RegExp('\n\n', 'g'), '</p><p>')  // 段落
              .replace(new RegExp('\n', 'g'), '<br>')        // 换行
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
                if (data.file === "/Users/fanmw/Desktop/study/VitePress-Lite/docs/01-getting-started/unit2.md") {
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
    