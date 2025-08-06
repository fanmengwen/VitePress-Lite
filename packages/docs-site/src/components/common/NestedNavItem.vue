<template>
  <li class="nav-item">
    <!-- 目录节点：有子项的节点 -->
    <div v-if="route.children && route.children.length > 0" class="nav-directory">
      <div class="nav-directory-header">
        <!-- 可点击的文本链接（如果有路径的话） -->
        <router-link 
          v-if="route.path && !route.redirect"
          :to="route.path"
          class="nav-directory-link"
          active-class="active"
          :style="{ paddingLeft: `${depth * 1.2 + 0.75}rem` }"
        >
          <span class="nav-directory-icon">{{ isExpanded ? '📂' : '📁' }}</span>
          <span class="nav-directory-title">{{ route.title }}</span>
        </router-link>
        
        <!-- 纯文本标题（无链接） -->
        <div 
          v-else
          class="nav-directory-text"
          :style="{ paddingLeft: `${depth * 1.2 + 0.75}rem` }"
        >
          <span class="nav-directory-icon">{{ isExpanded ? '📂' : '📁' }}</span>
          <span class="nav-directory-title">{{ route.title }}</span>
        </div>
        
        <!-- 独立的展开/收起按钮 -->
        <button 
          @click.stop="toggleExpanded" 
          class="nav-expand-button"
          :class="{ 'expanded': isExpanded }"
          :aria-expanded="isExpanded"
          :aria-label="isExpanded ? '收起子菜单' : '展开子菜单'"
          :title="isExpanded ? '收起子菜单' : '展开子菜单'"
        >
          <span class="nav-expand-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                :d="isExpanded ? 'M3 7.5L6 4.5L9 7.5' : 'M4.5 3L7.5 6L4.5 9'"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>
      
      <!-- 子项列表，使用过渡动画 -->
      <transition name="nav-expand">
        <ul v-show="isExpanded" class="nav-children">
          <NestedNavItem 
            v-for="childRoute in route.children" 
            :key="childRoute.path" 
            :route="childRoute"
            :depth="depth + 1"
          />
        </ul>
      </transition>
    </div>

    <!-- 文件节点：可点击的链接 -->
    <router-link 
      v-else
      :to="route.path" 
      class="nav-link"
      active-class="active"
      :style="{ paddingLeft: `${depth * 1.2 + 0.75}rem` }"
    >
      <span class="nav-file-icon">📄</span>
      <span class="nav-file-title">{{ route.title }}</span>
    </router-link>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface RouteItem {
  path: string;
  title: string;
  children?: RouteItem[];
  redirect?: string;
}

interface Props {
  route: RouteItem;
  depth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0
});

// 展开/收起状态
const isExpanded = ref(false);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}
</script>

<style scoped>
.nav-item {
  list-style: none;
  margin: 0;
}

/* === 目录节点样式 === */
.nav-directory {
  margin-bottom: var(--spacing-xs);
}

.nav-directory-header {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  transition: var(--transition-base);
  border: 1px solid transparent;
}

.nav-directory-header:hover {
  background: var(--color-primary-50);
}

/* 目录链接样式 */
.nav-directory-link {
  display: flex;
  align-items: center;
  flex: 1;
  padding: var(--spacing-md);
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: var(--transition-base);
  border-radius: var(--radius-md);
}

.nav-directory-link:hover {
  color: var(--color-primary);
}

.nav-directory-link.active {
  background: var(--color-primary-100);
  color: var(--color-primary-dark);
  font-weight: 600;
}

/* 目录纯文本样式 */
.nav-directory-text {
  display: flex;
  align-items: center;
  flex: 1;
  padding: var(--spacing-sm);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.nav-directory-icon {
  margin-right: var(--spacing-sm);
  font-size: var(--font-size-sm);
  transition: var(--transition-base);
}

.nav-directory-title {
  flex: 1;
  font-weight: 500;
}

/* === 独立的展开按钮 === */
.nav-expand-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: var(--spacing-sm);
  background: transparent;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-base);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.nav-expand-button:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
  transform: scale(1.05);
}

.nav-expand-button.expanded {
  background: var(--color-primary-100);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.nav-expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-base);
}

.nav-expand-button.expanded .nav-expand-icon {
  transform: rotate(180deg);
}

/* === 文件节点样式 === */
.nav-link {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--spacing-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: 400;
  transition: var(--transition-base);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  margin-bottom: var(--spacing-xs);
  background: var(--color-bg-primary);
}

.nav-link:hover {
  background: var(--color-primary-50);
  color: var(--color-primary);
  border-color: var(--color-primary-100);
  transform: translateX(4px);
}

.nav-link.active {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: 600;
  border-color: var(--color-primary-dark);
  box-shadow: var(--shadow-sm);
}

.nav-file-icon {
  margin-right: var(--spacing-sm);
  font-size: var(--font-size-xs);
  opacity: 0.7;
  transition: var(--transition-base);
}

.nav-link:hover .nav-file-icon,
.nav-link.active .nav-file-icon {
  opacity: 1;
}

.nav-file-title {
  flex: 1;
  line-height: var(--line-height-normal);
}

/* === 子项列表样式 === */
.nav-children {
  list-style: none;
  margin: var(--spacing-sm) 0 0 0;
  padding: 0;
  padding-left: var(--spacing-lg);
  border-left: 2px solid var(--color-primary-100);
  background: linear-gradient(to right, var(--color-primary-50), transparent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

/* === 展开/收起动画 === */
.nav-expand-enter-active {
  transition: all var(--transition-fast);
  overflow: hidden;
}

.nav-expand-leave-active {
  transition: all var(--transition-fast);
  overflow: hidden;
}

.nav-expand-enter-from {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.nav-expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.nav-expand-enter-to,
.nav-expand-leave-from {
  max-height: 500px;
  opacity: 1;
  transform: translateY(0);
}

/* === 响应式设计 === */
@media (max-width: 768px) {
  .nav-directory-link,
  .nav-directory-text,
  .nav-link {
    padding: var(--spacing-sm) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }

  .nav-expand-button {
    width: 28px;
    height: 28px;
    margin-right: var(--spacing-xs);
  }

  .nav-children {
    padding-left: var(--spacing-md);
  }
}

/* === 暗色模式支持 === */
@media (prefers-color-scheme: dark) {
  .nav-directory-header {
    background: var(--color-bg-secondary);
  }

  .nav-directory-header:hover {
    background: var(--color-primary-100);
  }

  .nav-link {
    background: var(--color-bg-secondary);
  }

  .nav-children {
    background: linear-gradient(to right, rgba(59, 130, 246, 0.1), transparent);
    border-left-color: rgba(59, 130, 246, 0.3);
  }
}

/* === 可访问性增强 === */
@media (prefers-reduced-motion: reduce) {
  .nav-directory-header,
  .nav-expand-button,
  .nav-expand-icon,
  .nav-link,
  .nav-file-icon,
  .nav-expand-enter-active,
  .nav-expand-leave-active {
    transition: none;
    animation: none;
    transform: none;
  }

  .nav-expand-button.expanded .nav-expand-icon {
    transform: none;
  }

  .nav-link:hover {
    transform: none;
  }
}

/* === 高对比度模式支持 === */
@media (prefers-contrast: high) {
  .nav-directory-header,
  .nav-link {
    border-color: var(--color-text-primary);
  }

  .nav-expand-button {
    border-width: 2px;
  }
}</style> 