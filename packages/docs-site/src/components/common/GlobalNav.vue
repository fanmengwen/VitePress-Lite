<template>
  <header class="global-nav">
    <nav class="nav-container">
      <!-- 首页链接 -->
      <router-link to="/" class="nav-home-link" active-class="active">
        <span class="nav-home-icon">🏠</span>
        <span>首页</span>
      </router-link>

      <!-- 文档导航 -->
      <div v-if="documentRoutes.length > 0" class="nav-docs">
        <h3 class="nav-section-title">📚 文档导航</h3>
        <ul class="nav-list">
          <NestedNavItem 
            v-for="route in documentRoutes" 
            :key="route.path" 
            :route="route"
            :depth="0"
          />
        </ul>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import router from "../../router";
import NestedNavItem from './NestedNavItem.vue';

interface RouteItem {
  path: string;
  title: string;
  children?: RouteItem[];
  redirect?: string;
}

// 过滤出文档路由（排除首页）
const documentRoutes = computed(() => {
  const routes = (router?.options?.routes as RouteItem[]) || [];
  return routes.filter((route) => route.path !== "/" && route.title);
});
</script>

<style scoped>
.global-nav {
  background-color: #2d2d2d;
  border-bottom: 1px solid #444;
  overflow-y: auto;
  max-height: 100vh;
}

.nav-container {
  padding: 1rem;
  min-width: 250px;
}

/* 首页链接样式 */
.nav-home-link {
  display: flex;
  align-items: center;
  color: #eee;
  text-decoration: none;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.2s, color 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-home-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #42b983;
}

.nav-home-link.active {
  background-color: rgba(66, 185, 131, 0.15);
  color: #42b983;
  border-color: #42b983;
}

.nav-home-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

/* 文档导航区域 */
.nav-docs {
  margin-top: 1rem;
}

.nav-section-title {
  color: #42b983;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(66, 185, 131, 0.3);
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .global-nav {
    position: static;
    max-height: none;
    overflow-y: visible;
  }
  
  .nav-container {
    padding: 0.75rem;
    min-width: auto;
  }
  
  .nav-section-title {
    font-size: 0.8rem;
  }
}

/* 滚动条样式 */
.global-nav::-webkit-scrollbar {
  width: 6px;
}

.global-nav::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.global-nav::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.global-nav::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>

