<template>
  <aside 
    class="document-sidebar"
    :class="{
      'is-visible': isVisible,
      'is-mobile': isMobile,
      'is-overlay': isMobile && isVisible
    }"
  >
    <!-- 移动端遮罩层 -->
    <div 
      v-if="isMobile && isVisible"
      class="sidebar-overlay"
      @click="closeSidebar"
    ></div>

    <!-- 侧边栏内容容器 -->
    <div class="sidebar-container">
      <!-- 侧边栏头部 -->
      <header class="sidebar-header">
        <div class="sidebar-title">
          <span class="title-icon">📚</span>
          <h2>文档导航</h2>
        </div>
        
        <!-- 移动端关闭按钮 -->
        <button
          v-if="isMobile"
          class="close-button"
          @click="closeSidebar"
          aria-label="关闭侧边栏"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path 
              d="M15 5L5 15M5 5L15 15" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <!-- 搜索框（可选功能） -->
      <div class="sidebar-search" v-if="showSearch">
        <div class="search-input-container">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文档..."
            class="search-input"
            @input="handleSearch"
          />
          <button
            v-if="searchQuery"
            class="clear-search"
            @click="clearSearch"
            aria-label="清除搜索"
          >
            ×
          </button>
        </div>
      </div>

      <!-- 侧边栏导航内容 -->
      <nav class="sidebar-nav" role="navigation" aria-label="文档导航">
        <div class="nav-content">
          <!-- 空状态 -->
          <div v-if="filteredItems.length === 0" class="empty-state">
            <span class="empty-icon">📭</span>
            <p v-if="searchQuery">未找到匹配的文档</p>
            <p v-else>暂无文档内容</p>
          </div>

          <!-- 导航项列表 -->
          <div v-else class="nav-items">
            <SidebarItem
              v-for="item in filteredItems"
              :key="item.path"
              :item="item"
              :level="0"
              :expanded-items="expandedItems"
              @item-click="handleItemClick"
              @toggle-expansion="handleToggleExpansion"
            />
          </div>
        </div>
      </nav>

      <!-- 侧边栏底部信息 -->
      <footer class="sidebar-footer">
        <div class="footer-info">
          <span class="info-text">共 {{ totalItems }} 项</span>
          <button
            class="collapse-all-btn"
            @click="handleCollapseAll"
            :title="allExpanded ? '全部折叠' : '全部展开'"
          >
            <span v-if="allExpanded">📁</span>
            <span v-else>📂</span>
          </button>
        </div>
      </footer>
    </div>
  </aside>

  <!-- 移动端切换按钮 -->
  <button
    v-if="isMobile"
    class="mobile-sidebar-toggle"
    @click="toggleSidebar"
    :class="{ 'is-active': isVisible }"
    aria-label="切换文档导航"
  >
    <span class="toggle-icon">
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path 
          d="M3 6H17M3 10H17M3 14H17" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round"
        />
      </svg>
    </span>
    <span class="toggle-text">导航</span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import SidebarItem from './SidebarItem.vue'
import type { SidebarItem as SidebarItemType } from '@/composables/useSidebar'

interface Props {
  items?: SidebarItemType[]
  isVisible?: boolean
  isMobile?: boolean
  showSearch?: boolean
}

interface Emits {
  (e: 'toggle-sidebar'): void
  (e: 'close-sidebar'): void
  (e: 'item-click', item: SidebarItemType): void
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  isVisible: false,
  isMobile: false,
  showSearch: true
})

const emit = defineEmits<Emits>()

const router = useRouter()

// 响应式状态
const searchQuery = ref('')
const expandedItems = ref<Set<string>>(new Set())

// 计算属性
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.items
  }

  const query = searchQuery.value.toLowerCase()
  return filterItemsBySearch(props.items, query)
})

const totalItems = computed(() => {
  return countTotalItems(props.items)
})

const allExpanded = computed(() => {
  const allExpandableItems = getAllExpandableItems(props.items)
  return allExpandableItems.every(item => expandedItems.value.has(item.path))
})

// 方法
const toggleSidebar = () => {
  emit('toggle-sidebar')
}

const closeSidebar = () => {
  emit('close-sidebar')
}

const handleItemClick = (item: SidebarItemType) => {
  emit('item-click', item)
  
  // 移动端点击后自动关闭侧边栏
  if (props.isMobile && item.isFile) {
    closeSidebar()
  }
}

const handleToggleExpansion = (path: string) => {
  if (expandedItems.value.has(path)) {
    expandedItems.value.delete(path)
  } else {
    expandedItems.value.add(path)
  }
}

const handleSearch = () => {
  // 搜索时自动展开相关项目
  if (searchQuery.value.trim()) {
    const matchingItems = getMatchingItems(props.items, searchQuery.value.toLowerCase())
    matchingItems.forEach(item => {
      // 展开包含匹配项的父级目录
      const pathSegments = item.path.split('/').filter(Boolean)
      for (let i = 1; i < pathSegments.length; i++) {
        const parentPath = '/' + pathSegments.slice(0, i).join('/')
        expandedItems.value.add(parentPath)
      }
    })
  }
}

const clearSearch = () => {
  searchQuery.value = ''
}

const handleCollapseAll = () => {
  if (allExpanded.value) {
    // 全部折叠
    expandedItems.value.clear()
  } else {
    // 全部展开
    const allExpandableItems = getAllExpandableItems(props.items)
    allExpandableItems.forEach(item => {
      expandedItems.value.add(item.path)
    })
  }
}

// 工具函数
const filterItemsBySearch = (items: SidebarItemType[], query: string): SidebarItemType[] => {
  const result: SidebarItemType[] = []
  
  items.forEach(item => {
    const titleMatch = item.title.toLowerCase().includes(query)
    const pathMatch = item.path.toLowerCase().includes(query)
    
    if (titleMatch || pathMatch) {
      result.push(item)
    } else if (item.children) {
      const filteredChildren = filterItemsBySearch(item.children, query)
      if (filteredChildren.length > 0) {
        result.push({
          ...item,
          children: filteredChildren
        })
      }
    }
  })
  
  return result
}

const countTotalItems = (items: SidebarItemType[]): number => {
  let count = 0
  items.forEach(item => {
    count++
    if (item.children) {
      count += countTotalItems(item.children)
    }
  })
  return count
}

const getAllExpandableItems = (items: SidebarItemType[]): SidebarItemType[] => {
  const result: SidebarItemType[] = []
  items.forEach(item => {
    if (item.children && item.children.length > 0) {
      result.push(item)
      result.push(...getAllExpandableItems(item.children))
    }
  })
  return result
}

const getMatchingItems = (items: SidebarItemType[], query: string): SidebarItemType[] => {
  const result: SidebarItemType[] = []
  items.forEach(item => {
    if (item.title.toLowerCase().includes(query) || item.path.toLowerCase().includes(query)) {
      result.push(item)
    }
    if (item.children) {
      result.push(...getMatchingItems(item.children, query))
    }
  })
  return result
}

// 键盘快捷键支持
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + K 打开搜索
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    const searchInput = document.querySelector('.search-input') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }
  
  // ESC 关闭侧边栏（移动端）
  if (event.key === 'Escape' && props.isMobile && props.isVisible) {
    closeSidebar()
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  
  // 初始化展开当前路由的父级目录
  const currentPath = router.currentRoute.value.path
  const pathSegments = currentPath.split('/').filter(Boolean)
  for (let i = 1; i <= pathSegments.length; i++) {
    const parentPath = '/' + pathSegments.slice(0, i).join('/')
    expandedItems.value.add(parentPath)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 监听路由变化，自动展开相关目录
watch(() => router.currentRoute.value.path, (newPath) => {
  const pathSegments = newPath.split('/').filter(Boolean)
  for (let i = 1; i <= pathSegments.length; i++) {
    const parentPath = '/' + pathSegments.slice(0, i).join('/')
    expandedItems.value.add(parentPath)
  }
})
</script>

<style scoped>
/* === 侧边栏主容器 === */
.document-sidebar {
  position: fixed;
  top: 64px; /* 导航栏高度 */
  left: 0;
  bottom: 0;
  width: 280px;
  background: var(--color-bg-primary);
  border-right: 1px solid var(--color-border-default);
  z-index: var(--z-sidebar);
  transform: translateX(-100%);
  transition: transform var(--transition-base);
  box-shadow: var(--shadow-lg);
}

.document-sidebar.is-visible {
  transform: translateX(0);
}

/* === 移动端样式 === */
.document-sidebar.is-mobile {
  top: 0;
  width: 100vw;
  z-index: var(--z-modal);
}

.document-sidebar.is-mobile.is-overlay {
  background: none;
  border: none;
  box-shadow: none;
}

.sidebar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

/* === 侧边栏容器 === */
.sidebar-container {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  z-index: 2;
}

.document-sidebar.is-mobile .sidebar-container {
  width: 280px;
  box-shadow: var(--shadow-2xl);
}

/* === 侧边栏头部 === */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-secondary);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.title-icon {
  font-size: var(--font-size-lg);
}

.sidebar-title h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: var(--transition-fast);
}

.close-button:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

/* === 搜索框 === */
.sidebar-search {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) calc(var(--spacing-md) * 2.5);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  transition: var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}

.clear-search {
  position: absolute;
  right: var(--spacing-sm);
  width: 20px;
  height: 20px;
  background: var(--color-bg-tertiary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  line-height: 1;
  transition: var(--transition-fast);
}

.clear-search:hover {
  background: var(--color-danger);
  color: white;
}

/* === 导航内容 === */
.sidebar-nav {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.nav-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) 0;
}

.nav-content::-webkit-scrollbar {
  width: 6px;
}

.nav-content::-webkit-scrollbar-track {
  background: transparent;
}

.nav-content::-webkit-scrollbar-thumb {
  background: var(--color-border-default);
  border-radius: var(--radius-full);
}

.nav-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-dark);
}

/* === 空状态 === */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-tertiary);
}

.empty-icon {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--spacing-lg);
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: var(--font-size-sm);
}

/* === 导航项容器 === */
.nav-items {
  padding: 0 var(--spacing-md);
}

/* === 侧边栏底部 === */
.sidebar-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
  background: var(--color-bg-secondary);
}

.footer-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.collapse-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-fast);
  font-size: var(--font-size-sm);
}

.collapse-all-btn:hover {
  background: var(--color-bg-tertiary);
}

/* === 移动端切换按钮 === */
.mobile-sidebar-toggle {
  position: fixed;
  top: 50%;
  left: var(--spacing-md);
  transform: translateY(-50%);
  z-index: var(--z-floating);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transition: var(--transition-fast);
  min-width: 48px;
  min-height: 48px;
}

.mobile-sidebar-toggle:hover {
  background: var(--color-primary-dark);
  transform: translateY(-50%) scale(1.05);
}

.mobile-sidebar-toggle.is-active {
  background: var(--color-danger);
}

.toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-text {
  font-size: var(--font-size-xs);
  font-weight: 500;
  line-height: 1;
}

/* === 响应式设计 === */
@media (min-width: 769px) {
  .mobile-sidebar-toggle {
    display: none;
  }

  .document-sidebar {
    position: fixed;
    top: 64px; /* 导航栏高度 */
    left: 0;
    transform: translateX(0);
    box-shadow: var(--shadow-lg);
  }

  .document-sidebar.is-visible {
    transform: translateX(0);
  }

  .close-button {
    display: none;
  }
}

@media (max-width: 768px) {
  .document-sidebar {
    top: 0;
  }

  .sidebar-header {
    padding-top: calc(var(--spacing-lg) + 20px); /* 状态栏安全区域 */
  }
}

/* === 暗色模式支持 === */
@media (prefers-color-scheme: dark) {
  .sidebar-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .nav-content::-webkit-scrollbar-thumb {
    background: var(--color-border-dark);
  }

  .nav-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-border-light);
  }
}

/* === 无动画模式 === */
@media (prefers-reduced-motion: reduce) {
  .document-sidebar,
  .mobile-sidebar-toggle,
  .search-input,
  .close-button,
  .collapse-all-btn,
  .clear-search {
    transition: none;
  }

  .mobile-sidebar-toggle:hover {
    transform: translateY(-50%);
  }
}
</style>
