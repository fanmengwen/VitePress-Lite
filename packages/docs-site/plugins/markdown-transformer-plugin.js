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
import fs from 'node:fs';


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

      // 3. 将所有信息拼接成一个 Vue SFC 字符串
      const vueSFC = `
      <template>
        <div class="markdown-page">
          <GlobalNav />
          <div class="markdown-body" v-html="html" />
        </div>
      </template>

      <script>
        import { ref, onMounted } from 'vue';
        import GlobalNav from '@/components/common/GlobalNav.vue';

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

           // HMR 客户端逻辑, 当文件发生变化时，更新页面
           // 否则 md 文件变化不在 vite 中触发，只会触发 ws ，但是不会触发 HMR
            if (import.meta.hot) {
              import.meta.hot.on('markdown-update', (data) => {

                // 当接收到自定义事件时，检查文件路径是否匹配
                if (data.file === "${id}") {
                  console.log('HMR update received for:', data.file);
                  frontmatter.value = data.frontmatter;
                  html.value = data.html;
                }
              });
            }

            return {
              frontmatter,
              html
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
    async handleHotUpdate({file, server}) {
      if (!file.endsWith('.md')) return;
      const code = await fs.promises.readFile(file, 'utf-8');
      
      // 3. 重新解析
      const { data: frontmatter, content } = matter(code);
      const html = md.render(content);

      // 4. 发送自定义事件到客户端
      server.ws.send({
        type: 'custom',
        event: 'markdown-update', // 自定义事件名
        data: {
          file,
          frontmatter,
          html
        }
      });
      
      // 5. 告诉 Vite 不需要整页刷新
      return [];
    },
  };
}
