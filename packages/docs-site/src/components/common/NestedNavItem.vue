<template>
  <li class="nav-item">
    <!-- 目录节点：有子项的节点 -->
    <div v-if="route.children && route.children.length > 0" class="nav-directory">
      <button 
        @click="toggleExpanded" 
        class="nav-directory-toggle"
        :class="{ 'expanded': isExpanded }"
        :aria-expanded="isExpanded"
      >
        <span class="nav-directory-icon">{{ isExpanded ? '📂' : '📁' }}</span>
        <span class="nav-directory-title">{{ route.title }}</span>
        <span class="nav-expand-icon">{{ isExpanded ? '−' : '+' }}</span>
      </button>
      
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

/* 目录节点样式 */
.nav-directory-toggle {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #eee;
  font-size: 0.9rem;
  transition: background-color 0.2s, color 0.2s;
  text-align: left;
}

.nav-directory-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #42b983;
}

.nav-directory-toggle.expanded {
  background-color: rgba(66, 185, 131, 0.1);
}

.nav-directory-icon {
  margin-right: 0.5rem;
  font-size: 0.8rem;
}

.nav-directory-title {
  flex: 1;
  font-weight: 500;
}

.nav-expand-icon {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  font-weight: bold;
  color: #42b983;
}

/* 文件节点样式 */
.nav-link {
  display: flex;
  align-items: center;
  color: #eee;
  text-decoration: none;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  transition: background-color 0.2s, color 0.2s;
  border-left: 3px solid transparent;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: #42b983;
}

.nav-link.active {
  background-color: rgba(66, 185, 131, 0.15);
  color: #42b983;
  border-left-color: #42b983;
  font-weight: 500;
}

.nav-file-icon {
  margin-right: 0.5rem;
  font-size: 0.7rem;
  opacity: 0.8;
}

.nav-file-title {
  flex: 1;
}

/* 子项列表样式 */
.nav-children {
  list-style: none;
  margin: 0;
  padding: 0;
  background-color: rgba(0, 0, 0, 0.1);
  border-left: 2px solid rgba(66, 185, 131, 0.3);
  margin-left: 1rem;
}

/* 展开/收起动画 */
.nav-expand-enter-active,
.nav-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.nav-expand-enter-from,
.nav-expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.nav-expand-enter-to,
.nav-expand-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* 深度缩进 */
.nav-item .nav-directory-toggle {
  padding-left: calc(var(--depth, 0) * 1.2rem + 0.75rem);
}
</style> 