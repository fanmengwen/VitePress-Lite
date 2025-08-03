<template>
  <div class="markdown-grid">
    <!-- 主要内容：静态文档列表 -->
    <div v-if="staticRouteList.length > 0" class="docs-section">
      <h2 class="section-title">📚 文档列表</h2>
      <div class="docs-grid">
        <MarkdownCard
          v-for="item in staticRouteList"
          :key="item.path"
          :title="item.title"
          :path="item.path"
          :isStatic="true"
        />
      </div>
    </div>

    <!-- 辅助内容：动态文章数据 -->
    <div v-if="postsData.posts.length > 0" class="articles-section">
      <h2 class="section-title">📝 最新文章</h2>
      <div class="articles-grid">
        <MarkdownCard
          v-for="post in postsData.posts.slice(0, 6)"
          :key="post.id"
          :post="post"
          :isStatic="false"
        />
      </div>
      <div v-if="postsData.posts.length > 6" class="more-articles">
        <p>还有 {{ postsData.posts.length - 6 }} 篇文章...</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="postsData.loading && staticRouteList.length === 0" class="loading-state">
      <div class="loading-spinner"></div>
      <p>正在加载内容...</p>
    </div>

    <!-- 完全空状态 -->
    <div v-if="staticRouteList.length === 0 && postsData.posts.length === 0 && !postsData.loading" class="empty-state">
      <p class="empty-message">📄 暂无内容</p>
      <div v-if="postsData.error" class="error-info">
        <p class="error-message">⚠️ {{ postsData.error }}</p>
        <button @click="postsData.refresh" class="retry-button">重试加载</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import MarkdownCard from "./MarkdownCard.vue";
import usePostsData from "@/composables/usePostsData";
import router from "../router";

interface RouteRecordRaw {
  path: string;
  title: string;
  children?: RouteRecordRaw[];
}

// 获取动态文章数据（作为辅助内容）
const postsData = usePostsData();

// 静态文档列表（主要内容）
const staticRouteList = computed(() => {
  const routes = (router?.options?.routes as RouteRecordRaw[]) || [];
  // 过滤出有 title 且不是首页的路由
  const docRoutes = routes.filter((route) => route.path !== "/" && route.title);
  
  // 按路径排序，确保顺序一致
  return docRoutes.sort((a, b) => {
    // 将 total 排在最前面
    if (a.path.includes('total')) return -1;
    if (b.path.includes('total')) return 1;
    return a.path.localeCompare(b.path);
  });
});
</script>

<style scoped>
.markdown-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 1rem;
}

/* 区域标题样式 */
.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e0e0e0;
}

/* 文档和文章网格 */
.docs-grid,
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

/* 区域容器 */
.docs-section,
.articles-section {
  background: #fafafa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.docs-section {
  border-left: 4px solid #007acc;
}

.articles-section {
  border-left: 4px solid #28a745;
}

/* 更多文章提示 */
.more-articles {
  text-align: center;
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  color: #666;
  font-style: italic;
}

/* Loading状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #007acc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #888;
}

.empty-message {
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.error-info {
  margin-top: 1rem;
}

.error-message {
  color: #e74c3c;
  margin-bottom: 1rem;
  font-weight: 500;
}

.retry-button {
  background: #007acc;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #005fa3;
}
</style>
