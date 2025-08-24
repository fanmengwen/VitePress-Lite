<template>
  <DocumentLayout>
    <div class="markdown-page">
      <div class="markdown-header">
        <h1>{{ pageTitle }}</h1>
        <div class="page-meta">
          <span class="current-path">{{ route.path }}</span>
        </div>
      </div>
      
      <div class="markdown-content" v-html="markdownContent"></div>
      
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>正在加载内容...</p>
      </div>
      
      <div v-if="error" class="error">
        <p>❌ {{ error }}</p>
      </div>
    </div>
  </DocumentLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DocumentLayout from './DocumentLayout.vue'

const route = useRoute()
const markdownContent = ref('')
const loading = ref(false)
const error = ref('')

// 从路由中获取页面标题
const pageTitle = computed(() => {
  return route.meta?.title || extractTitleFromPath(route.path)
})

// 从路径提取标题
const extractTitleFromPath = (path: string) => {
  const segments = path.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  return lastSegment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// 根据路由路径构建 markdown 文件路径
const getMarkdownPath = (routePath: string) => {
  // 路由路径如：/01-getting-started/unit1
  // 转换为：/docs/01-getting-started/unit1.md
  return `/docs${routePath}.md`
}

// 解析 frontmatter
const parseFrontmatter = (content: string) => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (match) {
    const frontmatter = match[1]
    const markdownContent = match[2]
    
    // 简单解析 frontmatter
    const metadata: Record<string, string> = {}
    frontmatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '')
        metadata[key.trim()] = value
      }
    })
    
    return { metadata, content: markdownContent }
  }
  
  return { metadata: {}, content }
}

// 改进的 markdown 转 HTML 解析器
const markdownToHtml = (markdown: string) => {
  let html = markdown
  
  // 1. 处理代码块（必须在行内代码之前处理）
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
    const lang = language || 'text'
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .trim()
    
    return `<pre><code class="language-${lang}">${escapedCode}</code></pre>`
  })
  
  // 2. 处理行内代码（在代码块之后）
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  
  // 3. 处理标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  
  // 4. 处理有序列表
  html = html.replace(/^(\d+\.\s+.+(?:\n\d+\.\s+.+)*)/gm, (match) => {
    const items = match.split('\n').map(line => {
      const content = line.replace(/^\d+\.\s+/, '')
      return `<li>${content}</li>`
    }).join('')
    return `<ol>${items}</ol>`
  })
  
  // 5. 处理无序列表
  html = html.replace(/^([-*+]\s+.+(?:\n[-*+]\s+.+)*)/gm, (match) => {
    const items = match.split('\n').map(line => {
      const content = line.replace(/^[-*+]\s+/, '')
      return `<li>${content}</li>`
    }).join('')
    return `<ul>${items}</ul>`
  })
  
  // 6. 处理引用
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>')
  
  // 7. 处理强调和斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  // 8. 处理链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  
  // 9. 处理段落（最后处理）
  const blocks = html.split('\n\n').map(block => {
    const trimmed = block.trim()
    if (!trimmed) return ''
    
    // 跳过已经是HTML标签的块
    if (trimmed.startsWith('<h') || 
        trimmed.startsWith('<pre') || 
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol')) {
      return trimmed
    }
    
    // 处理普通段落
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
  })
  
  return blocks.join('\n\n')
}

// 加载 markdown 内容
const loadMarkdownContent = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const markdownPath = getMarkdownPath(route.path)
    console.log('Loading markdown from:', markdownPath)
    
    const response = await fetch(markdownPath)
    
    if (!response.ok) {
      throw new Error(`无法加载文档: ${response.status}`)
    }
    
    const rawContent = await response.text()
    console.log('Raw content loaded, length:', rawContent.length)
    
    // 解析 frontmatter 和内容
    const { metadata, content } = parseFrontmatter(rawContent)
    console.log('Parsed metadata:', metadata)
    
    // 如果有 frontmatter 标题，更新页面标题
    if (metadata.title) {
      // 这里可以更新页面标题，但要注意响应式
    }
    
    // 转换 markdown 为 HTML
    markdownContent.value = markdownToHtml(content)
    console.log('HTML content generated, length:', markdownContent.value.length)
      
  } catch (err) {
    console.error('Failed to load markdown:', err)
    error.value = err instanceof Error ? err.message : '加载失败'
    markdownContent.value = `<div class="error-message">
      <h2>无法加载文档</h2>
      <p>路径: ${route.path}</p>
      <p>错误: ${error.value}</p>
    </div>`
  } finally {
    loading.value = false
  }
}

// 监听路由变化
watch(() => route.path, () => {
  loadMarkdownContent()
}, { immediate: true })

onMounted(() => {
  loadMarkdownContent()
})
</script>

<style scoped>
.markdown-page {
  width: 100%;
  padding: var(--spacing-lg);
}

.markdown-header {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.markdown-header h1 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.page-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
}

.current-path {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-family: var(--font-mono);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.markdown-content {
  line-height: 1.7;
  color: var(--color-text-primary);
}

/* Markdown 内容样式 */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: var(--spacing-xl) 0 var(--spacing-lg) 0;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-primary);
}

.markdown-content :deep(h1) { font-size: var(--font-size-2xl); }
.markdown-content :deep(h2) { font-size: var(--font-size-xl); }
.markdown-content :deep(h3) { font-size: var(--font-size-lg); }

.markdown-content :deep(p) {
  margin: 0 0 var(--spacing-lg) 0;
  line-height: 1.7;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: var(--color-text-primary);
}

.markdown-content :deep(em) {
  font-style: italic;
  color: var(--color-text-secondary);
}

/* 行内代码样式 */
.markdown-content :deep(code.inline-code) {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-tertiary);
  color: var(--color-text-accent);
  font-family: var(--font-mono);
  font-size: 0.9em;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

/* 代码块样式 */
.markdown-content :deep(pre) {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin: var(--spacing-lg) 0;
  overflow-x: auto;
  line-height: 1.5;
}

.markdown-content :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--color-text-primary);
  white-space: pre;
  word-wrap: normal;
}

/* 语言标识样式 */
.markdown-content :deep(pre) {
  position: relative;
}

.markdown-content :deep(pre code.language-typescript):before,
.markdown-content :deep(pre code.language-javascript):before,
.markdown-content :deep(pre code.language-ts):before,
.markdown-content :deep(pre code.language-js):before {
  content: attr(class);
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  font-family: var(--font-family-sans);
}

/* 列表样式 */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: var(--spacing-lg) 0;
  padding-left: var(--spacing-xl);
}

.markdown-content :deep(li) {
  margin: var(--spacing-sm) 0;
  line-height: 1.6;
}

.markdown-content :deep(ul li) {
  list-style-type: disc;
}

.markdown-content :deep(ol li) {
  list-style-type: decimal;
}

/* 引用样式 */
.markdown-content :deep(blockquote) {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-left: 4px solid var(--color-primary);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.markdown-content :deep(blockquote p) {
  margin: 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

/* 链接样式 */
.markdown-content :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: var(--transition-fast);
}

.markdown-content :deep(a:hover) {
  border-bottom-color: var(--color-primary);
  color: var(--color-primary-dark);
}

/* 水平分隔线 */
.markdown-content :deep(hr) {
  margin: var(--spacing-2xl) 0;
  border: none;
  height: 1px;
  background: var(--color-border-default);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border-light);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-lg);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  padding: var(--spacing-lg);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-lg);
  margin: var(--spacing-lg) 0;
}

.error p {
  margin: 0;
  font-weight: 500;
}
</style>
