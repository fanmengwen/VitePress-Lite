<template>
  <header 
    class="global-nav" 
    :class="{ 
      'nav-scrolled': isScrolled,
      'nav-mobile-open': isMobileMenuOpen 
    }"
  >
    <nav class="nav-container">
      <!-- 品牌/Logo 区域 -->
      <div class="nav-brand">
        <router-link to="/" class="nav-logo" active-class="active">
          <div class="logo-icon">📚</div>
          <span class="logo-text">VitePress Lite</span>
        </router-link>
      </div>

      <!-- 桌面端导航菜单 -->
      <div class="nav-menu-desktop">
        <router-link to="/" class="nav-item" active-class="active">
          <span class="nav-icon">🏠</span>
          <span>首页</span>
        </router-link>

        <!-- 文档导航下拉菜单 -->
        <div 
          v-if="documentRoutes.length > 0" 
          class="nav-dropdown"
          @mouseenter="showDropdown = true"
          @mouseleave="showDropdown = false"
        >
          <button class="nav-item dropdown-trigger" :class="{ active: showDropdown }">
            <span class="nav-icon">📖</span>
            <span>文档</span>
            <span class="dropdown-arrow" :class="{ rotated: showDropdown }">▼</span>
          </button>
          
          <transition name="dropdown">
            <div v-show="showDropdown" class="dropdown-menu">
              <div class="dropdown-content">
                <div class="dropdown-section">
                  <h4 class="dropdown-title">文档导航</h4>
                  <div class="dropdown-items">
                    <NestedNavItem 
                      v-for="route in documentRoutes" 
                      :key="route.path" 
                      :route="route"
                      :depth="0"
                      @click="showDropdown = false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- 移动端菜单按钮 -->
      <button 
        class="mobile-menu-toggle"
        @click="toggleMobileMenu"
        :aria-expanded="isMobileMenuOpen"
        aria-label="切换导航菜单"
      >
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
    </nav>

    <!-- 移动端导航菜单 -->
    <transition name="mobile-menu">
      <div v-show="isMobileMenuOpen" class="nav-menu-mobile">
        <div class="mobile-menu-content">
          <router-link to="/" class="mobile-nav-item" @click="closeMobileMenu">
            <span class="nav-icon">🏠</span>
            <span>首页</span>
          </router-link>
          
          <div v-if="documentRoutes.length > 0" class="mobile-nav-section">
            <h4 class="mobile-nav-title">📖 文档导航</h4>
            <div class="mobile-nav-items">
              <NestedNavItem 
                v-for="route in documentRoutes" 
                :key="route.path" 
                :route="route"
                :depth="0"
                @click="closeMobileMenu"
              />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import router from "../../router";
import NestedNavItem from './NestedNavItem.vue';

interface RouteItem {
  path: string;
  title: string;
  children?: RouteItem[];
  redirect?: string;
}

// 响应式状态
const isScrolled = ref(false);
const showDropdown = ref(false);
const isMobileMenuOpen = ref(false);

// 过滤出文档路由（排除首页）
const documentRoutes = computed(() => {
  const routes = (router?.options?.routes as RouteItem[]) || [];
  return routes.filter((route) => route.path !== "/" && route.title);
});

// 滚动监听
const handleScroll = () => {
  isScrolled.value = window.scrollY > 10;
};

// 移动端菜单控制
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// 生命周期钩子
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  handleScroll(); // 初始检查
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* === 导航容器基础样式 === */
.global-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: var(--transition-base);
}

.global-nav.nav-scrolled {
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid var(--color-border-default);
  box-shadow: var(--shadow-sm);
}

.nav-container {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

/* === 品牌/Logo 区域 === */
.nav-brand {
  flex-shrink: 0;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  text-decoration: none;
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: var(--font-size-lg);
  transition: var(--transition-base);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
}

.nav-logo:hover {
  background: var(--color-primary-50);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.logo-icon {
  font-size: var(--font-size-xl);
  line-height: 1;
}

.logo-text {
  font-family: var(--font-family-sans);
  letter-spacing: -0.02em;
}

/* === 桌面端导航菜单 === */
.nav-menu-desktop {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: var(--font-size-base);
  transition: var(--transition-base);
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
}

.nav-item:hover {
  color: var(--color-primary);
  background: var(--color-primary-50);
  transform: translateY(-1px);
}

.nav-item.active {
  color: var(--color-primary);
  background: var(--color-primary-100);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.nav-icon {
  font-size: var(--font-size-lg);
  line-height: 1;
}

/* === 下拉菜单样式 === */
.nav-dropdown {
  position: relative;
}

.dropdown-trigger {
  position: relative;
}

.dropdown-arrow {
  font-size: var(--font-size-xs);
  transition: var(--transition-base);
  margin-left: var(--spacing-xs);
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  margin-top: var(--spacing-md);
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.dropdown-content {
  padding: var(--spacing-lg);
}

.dropdown-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.dropdown-items {
  max-height: 300px;
  overflow-y: auto;
}

/* === 移动端菜单按钮 === */
.mobile-menu-toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  padding: var(--spacing-sm);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: var(--transition-base);
}

.mobile-menu-toggle:hover {
  background: var(--color-primary-50);
}

.hamburger-line {
  width: 20px;
  height: 2px;
  background: var(--color-text-primary);
  border-radius: var(--radius-full);
  transition: var(--transition-base);
}

.nav-mobile-open .hamburger-line:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.nav-mobile-open .hamburger-line:nth-child(2) {
  opacity: 0;
}

.nav-mobile-open .hamburger-line:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

/* === 移动端导航菜单 === */
.nav-menu-mobile {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border-default);
  box-shadow: var(--shadow-lg);
}

.mobile-menu-content {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  text-decoration: none;
  color: var(--color-text-primary);
  font-weight: 500;
  border-radius: var(--radius-lg);
  transition: var(--transition-base);
  margin-bottom: var(--spacing-sm);
}

.mobile-nav-item:hover {
  background: var(--color-primary-50);
  color: var(--color-primary);
}

.mobile-nav-section {
  margin-top: var(--spacing-xl);
}

.mobile-nav-title {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.mobile-nav-items {
  padding-left: var(--spacing-lg);
}

/* === 动画效果 === */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-base);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all var(--transition-base);
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* === 暗色模式支持 === */
@media (prefers-color-scheme: dark) {
  .global-nav {
    background: rgba(17, 24, 39, 0.8);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .global-nav.nav-scrolled {
    background: rgba(17, 24, 39, 0.95);
  }

  .dropdown-menu {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .nav-menu-mobile {
    background: rgba(17, 24, 39, 0.98);
  }
}

/* === 响应式设计 === */
@media (max-width: 768px) {
  .nav-menu-desktop {
    display: none;
  }

  .mobile-menu-toggle {
    display: flex;
  }

  .nav-container {
    padding: 0 var(--spacing-md);
  }

  .logo-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .nav-container {
    height: 56px;
    padding: 0 var(--spacing-sm);
  }

  .mobile-menu-content {
    padding: var(--spacing-md);
  }
}

/* === 可访问性增强 === */
@media (prefers-reduced-motion: reduce) {
  .global-nav,
  .nav-item,
  .dropdown-arrow,
  .hamburger-line,
  .dropdown-enter-active,
  .dropdown-leave-active,
  .mobile-menu-enter-active,
  .mobile-menu-leave-active {
    transition: none;
  }
}

/* 确保页面内容不被固定导航遮挡 */
:global(body) {
  padding-top: 64px;
}

@media (max-width: 480px) {
  :global(body) {
    padding-top: 56px;
  }
}</style>


