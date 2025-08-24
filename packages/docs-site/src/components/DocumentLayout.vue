<template>
  <div class="document-layout" :class="{ 'sidebar-open': sidebarVisible }">
    <!-- 全局导航 -->
    <GlobalNav />
    
    <!-- 文档侧边栏 -->
    <DocumentSidebar
      :items="sidebarItems"
      :is-visible="sidebarVisible"
      :is-mobile="isMobile"
      :show-search="true"
      @toggle-sidebar="toggleSidebar"
      @close-sidebar="closeSidebar"
      @item-click="handleSidebarItemClick"
    />
    
    <!-- 主内容区域 -->
    <main 
      class="main-content"
      :class="{ 'content-with-sidebar': sidebarVisible && !isMobile }"
    >
      <div class="content-wrapper">
        <slot />
      </div>
    </main>
    
    <!-- 页面遮罩（移动端） -->
    <div 
      v-if="isMobile && sidebarVisible" 
      class="page-overlay"
      @click="closeSidebar"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import GlobalNav from './common/GlobalNav.vue'
import DocumentSidebar from './DocumentSidebar.vue'
import { useSidebar, type SidebarItem } from '@/composables/useSidebar'

interface Emits {
  (e: 'sidebar-item-click', item: SidebarItem): void
}

const emit = defineEmits<Emits>()

const router = useRouter()
const route = useRoute()

// 使用 useSidebar composable
const {
  sidebarItems,
  toggleSidebar: toggleSidebarComposable,
  closeSidebar: closeSidebarComposable,
  openSidebar: openSidebarComposable
} = useSidebar()

// 响应式状态  
const sidebarVisible = ref(false)
const isMobile = ref(false)
const expandedItems = ref<Set<string>>(new Set())

// 方法
const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const closeSidebar = () => {
  sidebarVisible.value = false
}

const openSidebar = () => {
  sidebarVisible.value = true
}

const handleSidebarItemClick = (item: SidebarItem) => {
  emit('sidebar-item-click', item)
  
  // 移动端点击后关闭侧边栏
  if (isMobile.value && item.isFile) {
    closeSidebar()
  }
}

// 路由活跃状态检测（保留用于其他用途）
const isRouteActive = (path: string): boolean => {
  return route.path === path || route.path.startsWith(path + '/')
}

// 窗口大小检测
const handleResize = () => {
  const mobile = window.innerWidth < 768
  isMobile.value = mobile
  
  // 桌面端默认展开侧边栏，移动端默认隐藏
  if (!mobile) {
    sidebarVisible.value = true
  } else {
    sidebarVisible.value = false
  }
}

// 路由变化处理
const handleRouteChange = () => {
  // 移动端路由变化时关闭侧边栏
  if (isMobile.value) {
    closeSidebar()
  }

  // 自动展开当前路由的父级目录
  const pathSegments = route.path.split('/').filter(Boolean)
  for (let i = 1; i <= pathSegments.length; i++) {
    const parentPath = '/' + pathSegments.slice(0, i).join('/')
    expandedItems.value.add(parentPath)
  }
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + \ 切换侧边栏
  if ((event.ctrlKey || event.metaKey) && event.key === '\\') {
    event.preventDefault()
    toggleSidebar()
  }
  
  // ESC 关闭侧边栏（移动端）
  if (event.key === 'Escape' && isMobile.value && sidebarVisible.value) {
    closeSidebar()
  }
}

// 生命周期
onMounted(() => {
  handleResize()
  handleRouteChange()
  
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeydown)
  
  // 监听路由变化
  router.afterEach(handleRouteChange)
  
  // 确保桌面端初始状态下侧边栏可见
  if (window.innerWidth >= 768) {
    sidebarVisible.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleKeydown)
})

// 监听路由变化
watch(() => route.path, handleRouteChange)
</script>

<style scoped>
/* === 文档布局容器 === */
.document-layout {
  position: relative;
  min-height: 100vh;
  background: var(--color-bg-primary);
}

/* === 主内容区域 === */
.main-content {
  min-height: 100vh;
  padding-top: 64px; /* 导航栏高度 */
  transition: margin-left var(--transition-base);
}

.main-content.content-with-sidebar {
  margin-left: 280px; /* 侧边栏宽度 */
}

.content-wrapper {
  width: 100%;
  max-width: var(--container-content);
  margin: 0 auto;
  padding: var(--spacing-lg);
}

/* === 页面遮罩 === */
.page-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: calc(var(--z-sidebar) - 1);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* === 响应式设计 === */
@media (max-width: 768px) {
  .main-content {
    padding-top: 0;
  }
  
  .main-content.content-with-sidebar {
    margin-left: 0;
  }
  
  .content-wrapper {
    padding: var(--spacing-md);
  }
}

@media (min-width: 769px) {
  .page-overlay {
    display: none;
  }
}

/* === 打印样式 === */
@media print {
  .document-layout :deep(.global-nav),
  .document-layout :deep(.document-sidebar),
  .document-layout :deep(.mobile-sidebar-toggle) {
    display: none !important;
  }
  
  .main-content {
    margin-left: 0 !important;
    padding-top: 0 !important;
  }
  
  .content-wrapper {
    max-width: none !important;
    padding: 0 !important;
  }
}

/* === 暗色模式支持 === */
@media (prefers-color-scheme: dark) {
  .page-overlay {
    background: rgba(0, 0, 0, 0.7);
  }
}

/* === 无动画模式 === */
@media (prefers-reduced-motion: reduce) {
  .main-content {
    transition: none;
  }
}
</style>
