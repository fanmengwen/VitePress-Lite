<template>
  <div class="sidebar-item" :class="{ 'is-expanded': isExpanded }">
    <!-- 可点击的项目 -->
    <div 
      class="sidebar-item-content"
      :class="{
        'is-active': isActive,
        'is-current': isCurrent,
        'has-children': hasChildren,
        'is-file': item.isFile
      }"
      @click="handleClick"
    >
      <!-- 展开/折叠图标 -->
      <button
        v-if="hasChildren"
        class="expand-toggle"
        @click.stop="toggleExpansion"
        :aria-expanded="isExpanded"
        :aria-label="isExpanded ? '折叠目录' : '展开目录'"
      >
        <span class="expand-icon" :class="{ 'is-expanded': isExpanded }">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path 
              d="M6 4L10 8L6 12" 
              stroke="currentColor" 
              stroke-width="1.5" 
              fill="none" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>

      <!-- 文件/目录图标 -->
      <span class="item-icon">
        <span v-if="item.isFile">📄</span>
        <span v-else>📁</span>
      </span>

      <!-- 标题 -->
      <span class="item-title">{{ item.title }}</span>

      <!-- 活跃指示器 -->
      <span v-if="isCurrent" class="active-indicator"></span>
    </div>

    <!-- 子项目 -->
    <transition name="expand">
      <div v-if="hasChildren && isExpanded" class="sidebar-children">
        <SidebarItem
          v-for="child in item.children"
          :key="child.path"
          :item="child"
          :level="level + 1"
          @item-click="$emit('item-click', $event)"
        />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { SidebarItem as SidebarItemType } from '@/composables/useSidebar'

interface Props {
  item: SidebarItemType
  level?: number
  expandedItems?: Set<string>
}

interface Emits {
  (e: 'item-click', item: SidebarItemType): void
  (e: 'toggle-expansion', path: string): void
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  expandedItems: () => new Set()
})

const emit = defineEmits<Emits>()

const route = useRoute()
const router = useRouter()

// 计算属性
const hasChildren = computed(() => {
  return props.item.children && props.item.children.length > 0
})

const isExpanded = computed(() => {
  return hasChildren.value && (props.expandedItems?.has(props.item.path) || false)
})

const isActive = computed(() => {
  return route.path === props.item.path || route.path.startsWith(props.item.path + '/')
})

const isCurrent = computed(() => {
  return route.path === props.item.path
})

// 方法
const handleClick = () => {
  if (props.item.isFile && props.item.path) {
    // 文件类型，直接导航
    router.push(props.item.path)
  } else if (hasChildren.value) {
    // 目录类型，切换展开状态
    toggleExpansion()
  }
  
  emit('item-click', props.item)
}

const toggleExpansion = () => {
  emit('toggle-expansion', props.item.path)
}
</script>

<style scoped>
/* === 侧边栏项基础样式 === */
.sidebar-item {
  --item-indent: calc(var(--spacing-lg) * v-bind(level));
  position: relative;
}

.sidebar-item-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-left: var(--item-indent);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-fast);
  position: relative;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.4;
  min-height: 36px;
  user-select: none;
}

.sidebar-item-content:hover {
  background: var(--color-primary-50);
  color: var(--color-text-primary);
  transform: translateX(2px);
}

.sidebar-item-content.is-active {
  background: var(--color-primary-100);
  color: var(--color-primary-dark);
  font-weight: 600;
}

.sidebar-item-content.is-current {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.sidebar-item-content.is-current:hover {
  background: var(--color-primary-dark);
  transform: translateX(4px);
}

/* === 展开/折叠按钮 === */
.expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-fast);
  color: inherit;
  opacity: 0.7;
  flex-shrink: 0;
}

.expand-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
  opacity: 1;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast);
}

.expand-icon.is-expanded {
  transform: rotate(90deg);
}

/* === 项目图标 === */
.item-icon {
  font-size: var(--font-size-sm);
  line-height: 1;
  opacity: 0.8;
  flex-shrink: 0;
}

/* === 项目标题 === */
.item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* === 活跃指示器 === */
.active-indicator {
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

/* === 子项目容器 === */
.sidebar-children {
  position: relative;
}

.sidebar-children::before {
  content: '';
  position: absolute;
  left: calc(var(--item-indent) + var(--spacing-md) + 10px);
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--color-border-light);
  opacity: 0.5;
}

/* === 文件类型样式 === */
.sidebar-item-content.is-file {
  font-size: var(--font-size-xs);
}

.sidebar-item-content.is-file .item-icon {
  opacity: 0.6;
}

/* === 展开动画 === */
.expand-enter-active,
.expand-leave-active {
  transition: all var(--transition-base);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px; /* 足够大的值以容纳所有子项 */
  transform: translateY(0);
}

/* === 响应式设计 === */
@media (max-width: 768px) {
  .sidebar-item-content {
    padding: var(--spacing-md) var(--spacing-lg);
    min-height: 44px; /* 移动端增大点击区域 */
    font-size: var(--font-size-base);
  }

  .expand-toggle {
    width: 24px;
    height: 24px;
  }

  .item-icon {
    font-size: var(--font-size-base);
  }
}

/* === 深度层级样式调整 === */
.sidebar-item:nth-of-type(n) .sidebar-item-content {
  border-left: 2px solid transparent;
}

.sidebar-item .sidebar-item-content.is-current {
  border-left-color: white;
}

.sidebar-item .sidebar-item-content.is-active:not(.is-current) {
  border-left-color: var(--color-primary);
}

/* === 暗色模式支持 === */
@media (prefers-color-scheme: dark) {
  .sidebar-children::before {
    background: var(--color-border-dark);
  }

  .expand-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .sidebar-item-content.is-current {
    border-left-color: var(--color-primary-light);
  }
}

/* === 高对比度模式 === */
@media (prefers-contrast: high) {
  .sidebar-item-content {
    border: 1px solid transparent;
  }

  .sidebar-item-content:hover,
  .sidebar-item-content.is-active {
    border-color: var(--color-primary);
  }

  .sidebar-item-content.is-current {
    border-color: var(--color-primary-dark);
    border-width: 2px;
  }
}

/* === 无动画模式 === */
@media (prefers-reduced-motion: reduce) {
  .sidebar-item-content,
  .expand-icon,
  .expand-enter-active,
  .expand-leave-active,
  .active-indicator {
    transition: none;
    animation: none;
  }

  .sidebar-item-content:hover,
  .sidebar-item-content.is-current:hover {
    transform: none;
  }
}
</style>
