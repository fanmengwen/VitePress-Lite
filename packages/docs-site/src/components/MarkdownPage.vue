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
  return route.meta?.title || route.title || extractTitleFromPath(route.path)
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

// 加载 markdown 内容
const loadMarkdownContent = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const markdownPath = getMarkdownPath(route.path)
    const response = await fetch(markdownPath)
    
    if (!response.ok) {
      throw new Error(`无法加载文档: ${response.status}`)
    }
    
    const content = await response.text()
    
    // 简单的 markdown 转 HTML 处理
    markdownContent.value = content
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h(\d)><\/p>/g, '</h$1>')
      
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
    markdownContent.value = `<p>无法加载文档内容: ${route.path}</p>`
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
  max-width: var(--container-content);
  margin: 0 auto;
  padding: var(--spacing-xl);
}

.markdown-content {
  margin-top: var(--spacing-xl);
  line-height: var(--line-height-relaxed);
}
</style>
