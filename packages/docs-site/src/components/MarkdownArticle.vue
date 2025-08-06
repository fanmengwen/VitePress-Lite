<template>
  <div class="markdown-article-container">
    <!-- 页面背景 -->
    <div class="page-background"></div>
    
    <!-- 主文章内容卡片 -->
    <article class="markdown-article-card">
      <!-- 文章头部信息 -->
      <header class="article-header" v-if="article">
        <!-- 文章标题 -->
        <h1 class="article-title">{{ article.title }}</h1>
        
        <!-- 优化后的文章元信息区域 -->
        <div class="article-meta-container">
          <div class="article-meta-main">
            <!-- 左侧：作者和日期信息 -->
            <div class="author-date-group">
              <div class="meta-item author-info">
                <span class="meta-icon">👤</span>
                <span class="meta-label">作者：</span>
                <span class="meta-content">{{ article.author.name || article.author.email }}</span>
              </div>
              <div class="meta-item date-info">
                <span class="meta-icon">📅</span>
                <span class="meta-label">发布：</span>
                <span class="meta-content">{{ formatDate(article.createdAt) }}</span>
              </div>
              <div v-if="article.updatedAt !== article.createdAt" class="meta-item update-info">
                <span class="meta-icon">🔄</span>
                <span class="meta-label">更新：</span>
                <span class="meta-content">{{ formatDate(article.updatedAt) }}</span>
              </div>
            </div>
            
                         <!-- 右侧：标签和状态 -->
             <div class="tags-status-group">
               <div class="article-tags" v-if="mockTags.length > 0">
                 <span 
                   v-for="tag in mockTags" 
                   :key="tag" 
                   class="tag-item"
                   :class="getTagClass(tag)"
                 >
                   <span class="tag-icon">🏷️</span>
                   {{ tag }}
                 </span>
               </div>
               <div class="article-status">
                 <span class="status-badge published">
                   <span class="status-dot"></span>
                   已发布
                 </span>
               </div>
             </div>
          </div>
          
          <!-- 文章统计信息 -->
          <div class="article-stats">
            <div class="stat-item">
              <span class="stat-icon">📊</span>
              <span class="stat-text">{{ wordCount }} 字</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">⏱️</span>
              <span class="stat-text">约 {{ readingTime }} 分钟阅读</span>
            </div>
                         <div class="stat-item">
               <span class="stat-icon">👁️</span>
               <span class="stat-text">0 次浏览</span>
             </div>
          </div>
        </div>
      </header>
      
      <!-- 文章内容 -->
      <div class="article-content">
        <!-- 静态内容 -->
        <div v-if="staticContent" class="static-content markdown-body" v-html="staticContent"></div>
        
        <!-- 动态内容 -->
        <div v-else-if="article" class="dynamic-content markdown-body" v-html="article.content"></div>
        
        <!-- 加载状态 -->
        <div v-else class="loading-content">
          <div class="loading-spinner"></div>
          <p>正在加载内容...</p>
        </div>
      </div>
      
      <!-- 文章底部 -->
      <footer class="article-footer" v-if="article">
        <div class="article-actions">
                     <button class="action-btn like-btn" @click="toggleLike">
             <span class="btn-icon">{{ isLiked ? '❤️' : '🤍' }}</span>
             <span>0 点赞</span>
           </button>
          <button class="action-btn share-btn" @click="shareArticle">
            <span class="btn-icon">📤</span>
            <span>分享</span>
          </button>
          <button class="action-btn bookmark-btn" @click="toggleBookmark">
            <span class="btn-icon">{{ isBookmarked ? '🔖' : '📑' }}</span>
            <span>收藏</span>
          </button>
        </div>
        
        <div class="article-navigation" v-if="navigationLinks">
          <router-link 
            v-if="navigationLinks.prev" 
            :to="navigationLinks.prev.path" 
            class="nav-link prev-link"
          >
            <span class="nav-arrow">←</span>
            <span class="nav-text">{{ navigationLinks.prev.title }}</span>
          </router-link>
          <router-link 
            v-if="navigationLinks.next" 
            :to="navigationLinks.next.path" 
            class="nav-link next-link"
          >
            <span class="nav-text">{{ navigationLinks.next.title }}</span>
            <span class="nav-arrow">→</span>
          </router-link>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Post } from '@/api';

interface Props {
  article?: Post;
  staticContent?: string;
  navigationLinks?: {
    prev?: { path: string; title: string };
    next?: { path: string; title: string };
  };
}

const props = defineProps<Props>();

// 响应式状态
const isLiked = ref(false);
const isBookmarked = ref(false);

// 计算属性
const wordCount = computed(() => {
  if (props.article?.content) {
    return props.article.content.replace(/<[^>]*>/g, '').length;
  }
  if (props.staticContent) {
    return props.staticContent.replace(/<[^>]*>/g, '').length;
  }
  return 0;
});

const readingTime = computed(() => {
  const wordsPerMinute = 300; // 中文阅读速度
  return Math.ceil(wordCount.value / wordsPerMinute);
});

// 模拟标签数据（基于文章内容生成）
const mockTags = computed(() => {
  if (!props.article) return [];
  
  const content = props.article.content.toLowerCase();
  const tags: string[] = [];
  
  // 基于内容关键词生成标签
  if (content.includes('vue')) tags.push('Vue');
  if (content.includes('typescript') || content.includes('ts')) tags.push('TypeScript');
  if (content.includes('javascript') || content.includes('js')) tags.push('JavaScript');
  if (content.includes('css')) tags.push('CSS');
  if (content.includes('api')) tags.push('API');
  if (content.includes('教程') || content.includes('tutorial')) tags.push('教程');
  if (content.includes('指南') || content.includes('guide')) tags.push('指南');
  
  return tags.slice(0, 3); // 最多显示3个标签
});

// 方法
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTagClass = (tag: string): string => {
  const tagClasses: Record<string, string> = {
    'Vue': 'tag-vue',
    'JavaScript': 'tag-js',
    'TypeScript': 'tag-ts',
    'CSS': 'tag-css',
    'API': 'tag-api',
    '教程': 'tag-tutorial',
    '指南': 'tag-guide'
  };
  return tagClasses[tag] || 'tag-default';
};

const toggleLike = () => {
  isLiked.value = !isLiked.value;
  // TODO: 实现点赞API调用
};

const toggleBookmark = () => {
  isBookmarked.value = !isBookmarked.value;
  // TODO: 实现收藏API调用
};

const shareArticle = () => {
  if (navigator.share && props.article) {
    navigator.share({
      title: props.article.title,
      text: props.article.excerpt || '查看这篇精彩的文章',
      url: window.location.href
    });
  } else {
    // 回退到复制链接
    navigator.clipboard.writeText(window.location.href);
    // TODO: 显示复制成功提示
  }
};

onMounted(() => {
  // 初始化代码复制功能
  const { setupCodeBlockCopy } = require('@/utils/codeBlockCopy');
  setupCodeBlockCopy();
});
</script>

<style scoped>
/* === 页面容器和背景 === */
.markdown-article-container {
  min-height: 100vh;
  position: relative;
  padding: var(--spacing-2xl) 0;
}

.page-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  z-index: -1;
}

/* === 文章卡片主容器 === */
.markdown-article-card {
  max-width: var(--container-content);
  margin: 0 auto;
  background: var(--color-bg-primary);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  position: relative;
}

/* === 文章头部样式 === */
.article-header {
  padding: var(--spacing-3xl) var(--spacing-3xl) var(--spacing-2xl);
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
  border-bottom: 1px solid var(--color-border-light);
  position: relative;
}

.article-header::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, var(--color-primary-50) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(50%, -50%);
  pointer-events: none;
}

.article-title {
  font-size: var(--font-size-4xl);
  font-weight: 800;
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2xl) 0;
  position: relative;
  z-index: 1;
}

/* === 优化后的元信息区域 === */
.article-meta-container {
  position: relative;
  z-index: 1;
}

.article-meta-main {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
}

.author-date-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  flex: 1;
  min-width: 300px;
}

.tags-status-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-md);
  flex-shrink: 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.meta-icon {
  font-size: var(--font-size-base);
  opacity: 0.8;
}

.meta-label {
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.meta-content {
  font-weight: 600;
  color: var(--color-text-primary);
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: var(--transition-base);
}

.tag-item:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

/* 标签颜色主题 */
.tag-vue { 
  background: rgba(74, 222, 128, 0.1); 
  border-color: #4ade80; 
  color: #15803d; 
}

.tag-js { 
  background: rgba(251, 191, 36, 0.1); 
  border-color: #fbbf24; 
  color: #92400e; 
}

.tag-ts { 
  background: rgba(59, 130, 246, 0.1); 
  border-color: #3b82f6; 
  color: #1d4ed8; 
}

.tag-css { 
  background: rgba(236, 72, 153, 0.1); 
  border-color: #ec4899; 
  color: #be185d; 
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.status-badge.published {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.article-stats {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-icon {
  opacity: 0.7;
}

/* === 文章内容区域 === */
.article-content {
  padding: var(--spacing-3xl);
}

.markdown-body {
  line-height: var(--line-height-relaxed);
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

/* 继承已有的 markdown 样式 */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  color: var(--color-text-primary);
  font-weight: 600;
  margin-top: var(--spacing-3xl);
  margin-bottom: var(--spacing-lg);
}

.markdown-body p {
  margin-bottom: var(--spacing-xl);
}

.markdown-body pre {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  margin: var(--spacing-2xl) 0;
  overflow-x: auto;
  position: relative;
  box-shadow: var(--shadow-sm);
}

.markdown-body blockquote {
  margin: var(--spacing-2xl) 0;
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-left: 4px solid var(--color-primary);
  background: linear-gradient(90deg, var(--color-primary-50) 0%, var(--color-bg-secondary) 100%);
  border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
  color: var(--color-text-secondary);
  font-style: italic;
  position: relative;
  box-shadow: var(--shadow-sm);
}

.loading-content {
  text-align: center;
  padding: var(--spacing-4xl);
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border-light);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-lg);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* === 文章底部 === */
.article-footer {
  padding: var(--spacing-2xl) var(--spacing-3xl);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border-light);
}

.article-actions {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-base);
}

.action-btn:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
  transform: translateY(-1px);
}

.article-navigation {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-lg);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: var(--transition-base);
  flex: 1;
  max-width: 300px;
}

.nav-link:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.nav-link.next-link {
  justify-content: flex-end;
  text-align: right;
}

.nav-arrow {
  font-size: var(--font-size-lg);
  font-weight: bold;
}

.nav-text {
  font-weight: 500;
  font-size: var(--font-size-sm);
}

/* === 响应式设计 === */
@media (max-width: 768px) {
  .markdown-article-container {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .article-header {
    padding: var(--spacing-2xl) var(--spacing-lg);
  }

  .article-title {
    font-size: var(--font-size-3xl);
  }

  .article-meta-main {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-lg);
  }

  .tags-status-group {
    align-items: flex-start;
  }

  .article-tags {
    justify-content: flex-start;
  }

  .article-stats {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .article-content {
    padding: var(--spacing-2xl) var(--spacing-lg);
  }

  .markdown-body {
    font-size: var(--font-size-base);
  }

  .article-footer {
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  .article-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .article-navigation {
    flex-direction: column;
  }

  .nav-link {
    max-width: none;
  }

  .nav-link.next-link {
    justify-content: flex-start;
    text-align: left;
  }
}

/* === 暗色模式支持 === */
@media (prefers-color-scheme: dark) {
  .page-background {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }

  .article-header::before {
    background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
  }
}
</style> 