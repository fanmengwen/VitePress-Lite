<template>
  <div class="markdown-grid">
    <!-- 主要内容：分层文档列表 -->
    <div v-if="organizedRoutes.length > 0" class="docs-section">
      <h2 class="section-title">📚 文档列表</h2>
      
      <!-- 顶级文档 -->
      <div v-if="organizedRoutes.find(item => !item.isDirectory)" class="docs-level">
        <div class="docs-grid">
          <MarkdownCard
            v-for="item in organizedRoutes.filter(item => !item.isDirectory)"
            :key="item.path"
            :title="item.title"
            :path="item.path"
            :post="item.post"
            :isStatic="!item.post"
          />
        </div>
      </div>

      <!-- 目录及其文档 -->
      <div 
        v-for="directory in organizedRoutes.filter(item => item.isDirectory)" 
        :key="directory.path" 
        class="directory-section"
      >
        <h3 class="directory-title">
          <span class="directory-icon">📁</span>
          {{ directory.title }}
        </h3>
        
        <div class="docs-grid">
          <MarkdownCard
            v-for="doc in directory.documents"
            :key="doc.path"
            :title="doc.title"
            :path="doc.path"
            :post="doc.post"
            :isStatic="!doc.post"
          />
        </div>
      </div>
    </div>


    <!-- 加载状态 -->
    <div v-if="postsData.loading.value && organizedRoutes.length === 0" class="loading-state">
      <div class="loading-spinner"></div>
      <p>正在加载内容...</p>
    </div>

    <!-- 动态文章列表 -->
    <div v-if="postsData.posts.value.length > 0" class="articles-section">
      <h2 class="section-title">📰 文章列表</h2>
      <div class="articles-grid">
        <MarkdownCard
          v-for="post in postsData.posts.value"
          :key="post.id"
          :post="post"
          :isStatic="false"
        />
      </div>
    </div>

    <!-- 完全空状态 -->
    <div v-if="organizedRoutes.length === 0 && postsData.posts.value.length === 0 && !postsData.loading.value" class="empty-state">
      <p class="empty-message">📄 暂无内容</p>
      <div v-if="postsData.error.value" class="error-info">
        <p class="error-message">⚠️ {{ postsData.error.value }}</p>
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
  redirect?: string;
  post?: import("@/api").Post; // 关联的文章数据
}

interface OrganizedRoute {
  path: string;
  title: string;
  isDirectory: boolean;
  documents?: RouteRecordRaw[];
  post?: import("@/api").Post; // 关联的文章数据
}

// 获取动态文章数据（作为辅助内容）
const postsData = usePostsData();

// 组织化的路由结构
const organizedRoutes = computed(() => {
  const routes = (router?.options?.routes as RouteRecordRaw[]) || [];
  // 过滤出有 title 且不是首页的路由
  const docRoutes = routes.filter((route) => route.path !== "/" && route.title);
  
  const organized: OrganizedRoute[] = [];
  
  // 根据路径查找对应的文章数据
  const findPostByPath = (routePath: string) => {
    return postsData.posts.value.find(post => {
      // 移除路径开头的斜杠进行匹配
      const cleanPath = routePath.startsWith('/') ? routePath.slice(1) : routePath;
      return post.slug === cleanPath;
    });
  };
  
  docRoutes.forEach(route => {
    if (route.children && route.children.length > 0) {
      // 这是一个目录路由
      const directoryPost = findPostByPath(route.path);
      organized.push({
        path: route.path,
        title: route.title,
        isDirectory: true,
        post: directoryPost,
        documents: flattenChildren(route.children, findPostByPath).sort((a, b) => {
          // 对文档进行排序
          if (a.title.includes('总览') || a.title.includes('total')) return -1;
          if (b.title.includes('总览') || b.title.includes('total')) return 1;
          return a.title.localeCompare(b.title);
        })
      });
    } else {
      // 这是一个独立文档
      const documentPost = findPostByPath(route.path);
      organized.push({
        path: route.path,
        title: route.title,
        isDirectory: false,
        post: documentPost,
      });
    }
  });
  
  // 排序：独立文档在前，目录在后
  return organized.sort((a, b) => {
    if (!a.isDirectory && b.isDirectory) return -1;
    if (a.isDirectory && !b.isDirectory) return 1;
    
    // 将 total 排在最前面
    if (a.title.includes('总览') || a.path.includes('total')) return -1;
    if (b.title.includes('总览') || b.path.includes('total')) return 1;
    
    return a.title.localeCompare(b.title);
  });
});

// 扁平化子路由的辅助函数
function flattenChildren(children: RouteRecordRaw[], findPostByPath: (path: string) => import("@/api").Post | undefined): RouteRecordRaw[] {
  const flattened: RouteRecordRaw[] = [];
  
  children.forEach(child => {
    if (child.children && child.children.length > 0) {
      // 递归处理嵌套的子路由
      flattened.push(...flattenChildren(child.children, findPostByPath));
    } else {
      // 为子文档也查找对应的Post数据
      const childPost = findPostByPath(child.path);
      flattened.push({
        ...child,
        post: childPost
      });
    }
  });
  
  return flattened;
}
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
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e0e0e0;
}

/* 目录标题样式 */
.directory-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: #555;
  margin: 0 0 1rem 0;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 8px;
  border-left: 4px solid #42b983;
  display: flex;
  align-items: center;
}

.directory-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

/* 目录区域样式 */
.directory-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  transition: box-shadow 0.2s ease;
}

.directory-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* 文档和文章网格 */
.docs-grid,
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

/* 文档层级 */
.docs-level {
  margin-bottom: 1.5rem;
}

/* 区域容器 */
.docs-section {
  background: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.docs-section {
  border-left: 4px solid #007acc;
}

.articles-section {
  background: #fafafa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .docs-grid,
  .articles-grid {
    grid-template-columns: 1fr;
  }
  
  .directory-section {
    padding: 1rem;
  }
  
  .docs-section {
    padding: 1.5rem;
  }
  
  .section-title {
    font-size: 1.3rem;
  }
  
  .directory-title {
    font-size: 1.1rem;
    padding: 0.5rem 0.75rem;
  }
}
</style>

