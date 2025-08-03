<template>
  <component
    :is="linkComponent"
    :to="linkTo"
    :href="linkHref"
    class="card"
    :class="{ 'static-card': isStatic, 'dynamic-card': !isStatic }"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="title">{{ cardIcon }} {{ displayTitle }}</div>
      <div v-if="!isStatic && post" class="post-meta">
        <span class="author">👤 {{ post.author.email }}</span>
        <span class="date">📅 {{ formatDate(post.createdAt) }}</span>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="card-content">
      <div v-if="!isStatic && post && post.content" class="content-preview">
        {{ truncateContent(post.content) }}
      </div>
      <div class="path">{{ displayPath }}</div>
    </div>

    <!-- 卡片底部信息 -->
    <div v-if="!isStatic && post" class="card-footer">
      <span class="published-status"> ✅ 已发布 </span>
      <span class="updated-date"> 🔄 {{ formatDate(post.updatedAt) }} </span>
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
    return `/posts/${props.post.slug}`;
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
  return props.isStatic ? "📘" : "📰";
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
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1rem;
  background: #f9f9f9;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 140px;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* 静态卡片样式 */
.static-card {
  border-left: 4px solid #3498db;
}

/* 动态卡片样式 */
.dynamic-card {
  border-left: 4px solid #e74c3c;
  background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
}

/* 卡片头部 */
.card-header {
  flex-shrink: 0;
}

.title {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.post-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #666;
  flex-wrap: wrap;
}

.author,
.date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* 卡片内容 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.content-preview {
  font-size: 0.9rem;
  color: #555;
  line-height: 1.4;
  flex: 1;
}

.path {
  color: #888;
  font-size: 0.875rem;
  font-family: "Monaco", "Consolas", monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  align-self: flex-start;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #777;
  padding-top: 0.5rem;
  border-top: 1px solid #e8e8e8;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.published-status {
  color: #27ae60;
  font-weight: 500;
}

.updated-date {
  color: #888;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .post-meta {
    flex-direction: column;
    gap: 0.25rem;
  }

  .card-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
