// plugins/markdown-transformer-plugin.js

import MarkdownIt from "markdown-it";
import matter from "gray-matter";

export default function markdownTransformerPlugin() {
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
      const md = new MarkdownIt();
      const html = md.render(content);

      // 3. 将所有信息拼接成一个 Vue SFC 字符串
      const vueSFC = `
      <template>
        <div class="markdown-body">
          ${html}
        </div>
      </template>

      <script>
      export default {
        data() {
          return {
            frontmatter: ${JSON.stringify(frontmatter)}
          }
        },
        created() {
          if (this.frontmatter.title) {
            document.title = this.frontmatter.title;
          }
        }
      }
      </script>
    `;

      return {
        code: vueSFC,
        map: null, // sourcemap 在此暂不处理
      };
    },
  };
}
