<template>
  <component
    :is="linkComponent"
    :to="linkTo"
    :href="linkHref"
    class="card"
    :class="{ 
      'static-card': isStatic, 
      'dynamic-card': !isStatic,
      'has-image': cardImage
    }"
  >
    <!-- 卡片顶部装饰 -->
    <div class="card-decoration" :style="{ background: decorationGradient }"></div>
    
    <!-- 卡片头部 -->
    <div class="card-header">
      <!-- 分类标签 -->
      <div class="card-tags">
        <span class="card-type-tag" :class="{ 'static-type': isStatic, 'dynamic-type': !isStatic }">
          {{ cardTypeText }}
        </span>
        <span v-if="categoryTag" class="category-tag">
          {{ categoryTag }}
        </span>
        <span v-if="post" class="status-tag published">
          <span class="status-dot"></span>
          已发布
        </span>
      </div>
      
      <!-- 标题和图标 -->
      <div class="title-section">
        <div class="card-icon">{{ cardIcon }}</div>
        <h3 class="card-title">
          {{ displayTitle }}
          <span v-if="post" class="data-indicator" title="已关联文章数据">✨</span>
        </h3>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="card-content">
      <div v-if="post" class="content-preview">
        {{ displayExcerpt }}
      </div>
      <div v-else class="static-description">
        <p>{{ getStaticDescription() }}</p>
      </div>
    </div>

    <!-- 卡片元信息 -->
    <div class="card-meta">
      <div v-if="post" class="meta-info">
        <div class="meta-item">
          <span class="meta-icon">👤</span>
          <span class="meta-text">{{ post.author.name || post.author.email }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">📅</span>
          <span class="meta-text">{{ formatDate(post.createdAt) }}</span>
        </div>
        <div v-if="post.updatedAt !== post.createdAt" class="meta-item">
          <span class="meta-icon">🔄</span>
          <span class="meta-text">{{ formatDate(post.updatedAt) }}</span>
        </div>
      </div>
      <div v-else class="static-meta">
        <div class="meta-item">
          <span class="meta-icon">📄</span>
          <span class="meta-text">静态文档</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">🔗</span>
          <span class="meta-text">{{ displayPath }}</span>
        </div>
      </div>
    </div>

    <!-- 卡片底部行动区域 -->
    <div class="card-actions">
      <div class="reading-info">
        <span class="reading-time">
          <span class="meta-icon">⏱️</span>
          {{ estimatedReadingTime }}
        </span>
      </div>
      <div class="action-button">
        <span class="action-text">{{ isStatic ? '查看文档' : '阅读文章' }}</span>
        <span class="action-arrow">→</span>
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Post } from "@/api";

interface Props {
  // 静态路由props
  title?: string;
  path?: string;
  isStatic?: boolean;

  // 动态文章props
  post?: Post;
}

const props = withDefaults(defineProps<Props>(), {
  isStatic: true,
});

// 计算链接组件类型
const linkComponent = computed(() => {
  return props.isStatic ? "router-link" : "a";
});

// 计算链接目标
const linkTo = computed(() => {
  return props.isStatic ? props.path : undefined;
});

const linkHref = computed(() => {
  if (!props.isStatic && props.post) {
    // 动态文章使用slug生成链接
    return `/${props.post.slug}`;
  }
  return undefined;
});

// 显示标题
const displayTitle = computed(() => {
  if (props.isStatic) {
    return props.title || "未命名页面";
  }
  return props.post?.title || "未命名文章";
});

// 显示路径
const displayPath = computed(() => {
  if (props.isStatic) {
    return props.path || "/";
  }
  return `/posts/${props.post?.slug || "unknown"}`;
});

// 卡片图标
const cardIcon = computed(() => {
  if (props.isStatic) {
    // 根据路径判断文档类型
    const path = props.path || "";
    if (path.includes("unit")) return "📖";
    if (path.includes("total") || path.includes("overview")) return "📋";
    if (path.includes("api")) return "🔧";
    if (path.includes("guide")) return "📚";
    return "📘";
  }
  return "📰";
});

// 卡片类型文本
const cardTypeText = computed(() => {
  return props.isStatic ? "文档" : "文章";
});

// 分类标签
const categoryTag = computed(() => {
  if (props.isStatic && props.path) {
    const path = props.path;
    if (path.includes("unit1")) return "Unit 1";
    if (path.includes("unit2")) return "Unit 2";
    if (path.includes("unit3")) return "Unit 3";
    if (path.includes("total")) return "总览";
    if (path.includes("api")) return "API";
    if (path.includes("guide")) return "指南";
  }
  return null;
});

// 装饰渐变
const decorationGradient = computed(() => {
  if (props.isStatic) {
    return "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)";
  }
  return "linear-gradient(135deg, var(--color-success) 0%, var(--color-info) 100%)";
});

// 获取静态描述
const getStaticDescription = () => {
  if (props.path) {
    const path = props.path;
    if (path.includes("unit1")) return "第一单元相关文档内容，包含基础概念和入门指南。";
    if (path.includes("unit2")) return "第二单元相关文档内容，涵盖进阶功能和实践案例。";
    if (path.includes("unit3")) return "第三单元相关文档内容，深入探讨高级特性和优化技巧。";
    if (path.includes("total")) return "项目总览文档，包含完整的项目介绍和使用说明。";
    if (path.includes("api")) return "API 文档，详细介绍各个接口的使用方法和参数。";
  }
  return "查看详细的文档内容和使用说明。";
};

// 显示文章摘要
const displayExcerpt = computed(() => {
  if (!props.post) return "";
  
  // 优先使用 excerpt，否则截断 content
  if (props.post.excerpt) {
    return props.post.excerpt;
  }
  
  if (props.post.content) {
    return truncateContent(props.post.content, 120);
  }
  
  return "暂无简介...";
});

// 预估阅读时间
const estimatedReadingTime = computed(() => {
  if (props.post && props.post.content) {
    const wordCount = props.post.content.length;
    const readingSpeed = 300; // 每分钟阅读字数
    const minutes = Math.ceil(wordCount / readingSpeed);
    return `${minutes} 分钟阅读`;
  }
  return "2-5 分钟阅读";
});

// 卡片图片（预留功能）
const cardImage = computed(() => {
  // 可以根据内容或配置返回图片URL
  return null;
});

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// 截断内容预览
const truncateContent = (content: string, maxLength = 120): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "...";
};
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  position: relative;
  transition: var(--transition-base);
  box-shadow: var(--shadow-card);
  min-height: 280px;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-primary-100);
}

.card:active {
  transform: translateY(-2px);
}

/* 卡片装饰条 */
.card-decoration {
  height: 4px;
  width: 100%;
  background: var(--color-primary);
}

.static-card .card-decoration {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
}

.dynamic-card .card-decoration {
  background: linear-gradient(135deg, var(--color-success) 0%, var(--color-info) 100%);
}

/* 卡片头部 */
.card-header {
  padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-lg);
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.card-type-tag,
.category-tag,
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-type-tag.static-type {
  background: var(--color-primary-100);
  color: var(--color-primary-dark);
}

.card-type-tag.dynamic-type {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.category-tag {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-light);
}

.status-tag.published {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.title-section {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.card-icon {
  font-size: var(--font-size-2xl);
  line-height: 1;
  flex-shrink: 0;
  margin-top: var(--spacing-xs);
}

.card-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: var(--line-height-tight);
  margin: 0;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.data-indicator {
  font-size: var(--font-size-sm);
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 卡片内容 */
.card-content {
  flex: 1;
  padding: 0 var(--spacing-xl) var(--spacing-lg);
}

.content-preview,
.static-description {
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-secondary);
}

.static-description p {
  margin: 0;
}

/* 卡片元信息 */
.card-meta {
  padding: 0 var(--spacing-xl) var(--spacing-lg);
}

.meta-info,
.static-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.meta-icon {
  font-size: var(--font-size-sm);
  opacity: 0.8;
}

.meta-text {
  font-weight: 500;
}

/* 卡片行动区域 */
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border-light);
  margin-top: auto;
}

.reading-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.reading-time {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary);
  transition: var(--transition-base);
}

.card:hover .action-button {
  color: var(--color-primary-dark);
}

.action-arrow {
  transition: var(--transition-base);
}

.card:hover .action-arrow {
  transform: translateX(4px);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .card-header {
    padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
  }

  .card-content,
  .card-meta {
    padding-left: var(--spacing-lg);
    padding-right: var(--spacing-lg);
  }

  .card-actions {
    padding: var(--spacing-md) var(--spacing-lg);
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: flex-start;
  }

  .meta-info,
  .static-meta {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .card-title {
    font-size: var(--font-size-lg);
  }

  .title-section {
    gap: var(--spacing-sm);
  }

  .card-icon {
    font-size: var(--font-size-xl);
  }
}

/* 可访问性增强 */
@media (prefers-reduced-motion: reduce) {
  .card,
  .action-arrow,
  .data-indicator {
    transition: none;
    animation: none;
  }
}

/* 焦点状态 */
.card:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 不同主题下的微调 */
@media (prefers-color-scheme: dark) {
  .card-actions {
    background: var(--color-bg-tertiary);
  }
}
</style>
