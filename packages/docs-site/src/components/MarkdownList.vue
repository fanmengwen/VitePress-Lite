<template>
  <div class="hierarchy-list">
    <!-- 文档总览 -->
    <div v-if="organizedRoutes.length > 0" class="docs-overview">
      <h2 class="overview-title">📚 文档总览</h2>
      
      <div class="documents-list">
        <!-- 顶级文档（总览文档） -->
        <div v-if="topLevelDocs.length > 0" class="top-level-docs">
          <div 
            v-for="doc in topLevelDocs" 
            :key="doc.path" 
            class="document-item top-level"
            @click="navigateToDocument(doc.path)"
          >
            <div class="document-header">
              <div class="document-info">
                <h3 class="document-title">{{ doc.title }}</h3>
                <p v-if="doc.post?.excerpt" class="document-description">{{ doc.post.excerpt }}</p>
                <p v-else class="document-description">{{ getDocumentDescription(doc) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 目录结构文档 -->
        <div 
          v-for="directory in directoryDocs" 
          :key="directory.path" 
          class="directory-item"
        >
          <!-- 目录标题 -->
          <div 
            class="directory-header"
            @click="toggleDirectory(directory.path)"
          >
            <span class="collapse-icon" :class="{ expanded: expandedDirectories.has(directory.path) }">
              {{ expandedDirectories.has(directory.path) ? '▼' : '►' }}
            </span>
            <span class="directory-icon">📁</span>
            <h3 class="directory-title">{{ directory.title }}</h3>
            <span class="document-count">({{ directory.documents?.length || 0 }})</span>
          </div>
          
          <!-- 目录下的文档 -->
          <div v-if="expandedDirectories.has(directory.path)" class="directory-documents">
            <div 
              v-for="doc in directory.documents" 
              :key="doc.path" 
              class="document-item nested"
              @click="navigateToDocument(doc.path)"
            >
              <div class="document-header">
                <div class="document-info">
                  <h4 class="document-title">{{ doc.title }}</h4>
                  <p v-if="doc.post?.excerpt" class="document-description">{{ doc.post.excerpt }}</p>
                  <p v-else class="document-description">{{ getDocumentDescription(doc) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="postsData.loading.value && organizedRoutes.length === 0" class="loading-state">
      <div class="loading-spinner"></div>
      <p>正在加载内容...</p>
    </div>

    <!-- 独立文章列表 -->
    <div v-if="standalonePosts.length > 0" class="articles-section">
      <h2 class="section-title">📰 最新文章</h2>
      <div class="articles-list">
        <div 
          v-for="post in standalonePosts.slice(0, 5)" 
          :key="post.id" 
          class="article-item"
          @click="navigateToArticle(post)"
        >
          <div class="article-header">
            <div class="article-info">
              <h4 class="article-title">{{ post.title }}</h4>
              <p v-if="post.excerpt" class="article-description">{{ post.excerpt }}</p>
              <div class="article-meta">
                <span class="article-date">{{ formatDate(post.createdAt) }}</span>
                <span class="article-author">{{ post.author.name || post.author.email }}</span>
              </div>
            </div>
            <span class="document-type article-badge">文章</span>
          </div>
        </div>
      </div>
      
      <div v-if="standalonePosts.length > 5" class="more-articles">
        共 {{ standalonePosts.length }} 篇文章，显示最新 5 篇
      </div>
    </div>

    <!-- 完全空状态 -->
    <div v-if="organizedRoutes.length === 0 && standalonePosts.length === 0 && !postsData.loading.value" class="empty-state">
      <p class="empty-message">📄 暂无内容</p>
      <div v-if="postsData.error.value" class="error-info">
        <p class="error-message">⚠️ {{ postsData.error.value }}</p>
        <button @click="postsData.refresh" class="retry-button">重试加载</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import usePostsData from "@/composables/usePostsData";
import router from "../router";
import { scrollToTop } from "@/utils/scrollUtils";

interface RouteRecordRaw {
  path: string;
  title: string;
  hidden?: boolean;
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

// 展开状态管理
const expandedDirectories = ref(new Set<string>());

// 切换目录展开/收起状态
const toggleDirectory = (directoryPath: string) => {
  if (expandedDirectories.value.has(directoryPath)) {
    expandedDirectories.value.delete(directoryPath);
  } else {
    expandedDirectories.value.add(directoryPath);
  }
};

// 导航到文档
const navigateToDocument = (path: string) => {
  router.push(path);
  // 路由守卫会处理滚动，这里不需要额外操作
};

// 导航到文章
const navigateToArticle = (post: import("@/api").Post) => {
  router.push(`/${post.slug}`);
  // 路由守卫会处理滚动，这里不需要额外操作
};

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// 获取文档描述
const getDocumentDescription = (doc: RouteRecordRaw) => {
  if (doc.title.includes('总览') || doc.path.includes('total')) {
    return '项目总览文档，包含完整的项目介绍和使用说明。';
  }
  if (doc.title.includes('HMR') || doc.title.includes('热更新')) {
    return '深入解析热更新原理和实现机制。';
  }
  if (doc.title.includes('配置') || doc.title.includes('setting')) {
    return '查看详细的项目配置内容和使用说明。';
  }
  if (doc.title.includes('核心理念')) {
    return '基础概念和核心理念，是学习的起点。';
  }
  return `${doc.title}相关文档内容。`;
};

// 辅助函数：递归收集所有文档路径
function collectDocPaths(routes: RouteRecordRaw[], pathSet: Set<string>) {
  routes.forEach(route => {
    // 移除路径开头的斜杠进行匹配
    const cleanPath = route.path.startsWith('/') ? route.path.slice(1) : route.path;
    pathSet.add(cleanPath);
    if (route.children && route.children.length > 0) {
      collectDocPaths(route.children, pathSet);
    }
  });
}

// 组织化的路由结构
const organizedRoutes = computed(() => {
  const routes = (router?.options?.routes as RouteRecordRaw[]) || [];
  const docRoutes = routes.filter((route) => route.path !== "/" && route.title);
  
  const organized: OrganizedRoute[] = [];
  
  // 根据路径查找对应的文章数据
  const findPostByPath = (routePath: string) => {
    return postsData.posts.value.find(post => {
      const cleanPath = routePath.startsWith('/') ? routePath.slice(1) : routePath;
      return post.slug === cleanPath;
    });
  };
  
  docRoutes.forEach(route => {
    if(route.hidden) return;
    if (route.children && route.children.length > 0) {
      const directoryPost = findPostByPath(route.path);
      organized.push({
        path: route.path,
        title: route.title,
        isDirectory: true,
        post: directoryPost,
        documents: flattenChildren(route.children, findPostByPath).sort((a, b) => {
          if (a.title.includes('总览') || a.title.includes('total')) return -1;
          if (b.title.includes('总览') || b.title.includes('total')) return 1;
          return a.title.localeCompare(b.title);
        })
      });
    } else {
      const documentPost = findPostByPath(route.path);
      organized.push({
        path: route.path,
        title: route.title,
        isDirectory: false,
        post: documentPost,
      });
    }
  });
  
  return organized;
});

// 顶级文档（不属于任何目录的独立文档）
const topLevelDocs = computed(() => {
  return organizedRoutes.value
    .filter(item => !item.isDirectory)
    .sort((a, b) => {
      // 将 total 排在最前面
      if (a.title.includes('总览') || a.path.includes('total')) return -1;
      if (b.title.includes('总览') || b.path.includes('total')) return 1;
      return a.title.localeCompare(b.title);
    });
});

// 目录文档
const directoryDocs = computed(() => {
  return organizedRoutes.value
    .filter(item => item.isDirectory)
    .sort((a, b) => a.title.localeCompare(b.title));
});

// 扁平化子路由的辅助函数
function flattenChildren(children: RouteRecordRaw[], findPostByPath: (path: string) => import("@/api").Post | undefined): RouteRecordRaw[] {
  const flattened: RouteRecordRaw[] = [];
  
  children.forEach(child => {
    if (child.children && child.children.length > 0) {
      flattened.push(...flattenChildren(child.children, findPostByPath));
    } else {
      const childPost = findPostByPath(child.path);
      flattened.push({
        ...child,
        post: childPost
      });
    }
  });
  
  return flattened;
}

// 新增：过滤出不属于任何文档的独立文章
const standalonePosts = computed(() => {
  if (!postsData.posts.value || postsData.posts.value.length === 0) {
    return [];
  }
  
  // 1. 收集所有文档路径
  const docPaths = new Set<string>();
  const routes = (router?.options?.routes as RouteRecordRaw[]) || [];
  collectDocPaths(routes, docPaths);
  
  // 3. 按日期排序（最新在前）
  return postsData.posts.value.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});
</script>

<style scoped>
.hierarchy-list {
  max-width: 800px;
  margin: 0 auto;
}

/* 文档总览容器 */
.docs-overview {
  background: var(--color-bg-primary);
  border-radius: 12px;
  border: 1px solid var(--color-border-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  overflow: hidden;
  margin-bottom: 2rem;
}

.overview-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100));
  border-bottom: 1px solid var(--color-border-light);
}

/* 文档列表 */
.documents-list {
  padding: 0;
}

/* 顶级文档区域 */
.top-level-docs {
  border-bottom: 1px solid var(--color-border-light);
}

/* 文档项 */
.document-item {
  border-bottom: 1px solid var(--color-border-light);
  transition: all 0.2s ease;
  cursor: pointer;
}

.document-item:last-child {
  border-bottom: none;
}

.document-item:hover {
  background: var(--color-bg-secondary);
}

.document-item.top-level:hover {
  background: linear-gradient(135deg, var(--color-primary-50), var(--color-bg-secondary));
}

/* 文档头部 */
.document-header {
  display: flex;
  align-items: center;
  padding: 1rem 2rem;
  gap: 1rem;
}

.document-item.nested .document-header {
  padding-left: 4rem;
}


.document-info {
  flex: 1;
  min-width: 0;
}

.document-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.document-item.top-level .document-title {
  font-size: 1.2rem;
  font-weight: 600;
}

.document-item.nested .document-title {
  font-size: 1rem;
}

.document-description {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-type {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
  flex-shrink: 0;
  background: var(--color-primary);
  color: white;
}



.document-type.article-badge {
  background: var(--color-success);
  color: white;
}

/* 目录项 */
.directory-item {
  border-bottom: 1px solid var(--color-border-light);
}

.directory-item:last-child {
  border-bottom: none;
}

/* 目录头部 */
.directory-header {
  display: flex;
  align-items: center;
  padding: 1rem 2rem;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-bg-secondary);
}

.directory-header:hover {
  background: var(--color-primary-50);
}

.collapse-icon {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
  width: 16px;
  text-align: center;
}

.collapse-icon.expanded {
  transform: rotate(0deg);
}

.directory-icon {
  font-size: 1.1rem;
  color: var(--color-info);
}

.directory-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  flex: 1;
}

.document-count {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--color-border-light);
}

/* 目录文档容器 */
.directory-documents {
  background: var(--color-bg-primary);
}

/* 文章区域 */
.articles-section {
  background: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border-light);
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-border-default);
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.article-item {
  border-bottom: 1px solid var(--color-border-light);
  transition: all 0.2s ease;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.article-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.article-item:hover {
  background: var(--color-bg-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.article-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  gap: 1rem;
}


.article-info {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.article-description {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.article-date {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.article-author {
  font-size: 0.75rem;
  color: var(--color-primary);
  background: var(--color-primary-50);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.more-articles {
  text-align: center;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-bg-primary);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-style: italic;
  border: 1px solid var(--color-border-light);
}

/* Loading状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border-light);
  border-top: 3px solid var(--color-primary);
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
  color: var(--color-text-secondary);
}

.empty-message {
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.error-info {
  margin-top: 1rem;
}

.error-message {
  color: var(--color-danger);
  margin-bottom: 1rem;
  font-weight: 500;
}

.retry-button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: var(--color-primary-dark);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hierarchy-list {
    margin: 0;
  }
  
  .docs-overview {
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }
  
  .overview-title {
    font-size: 1.3rem;
    padding: 1rem 1.5rem;
  }
  
  .document-header,
  .directory-header,
  .article-header {
    padding: 0.75rem 1rem;
  }
  
  .document-item.nested .document-header {
    padding-left: 2.5rem;
  }
  
  .document-title {
    font-size: 1rem;
  }
  
  .document-item.top-level .document-title {
    font-size: 1.1rem;
  }
  
  .directory-title {
    font-size: 1rem;
  }
  
  .articles-section {
    padding: 1rem;
    border-radius: 8px;
  }
  
  .section-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 480px) {
  .document-description,
  .article-description {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>