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
        <router-link v-if="docsHomePath" :to="docsHomePath" class="nav-item" active-class="active">
          <span class="nav-icon">📖</span>
          <span>文档</span>
        </router-link>
        <a
          :href="githubUrl"
          class="nav-item"
          target="_blank"
          rel="noopener noreferrer"
          :title="githubUrl"
        >
          <svg class="nav-icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8 16 3.58 12.42 0 8 0z"/>
          </svg>
          <span>GitHub</span>
        </a>
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
          <router-link v-if="docsHomePath" :to="docsHomePath" class="mobile-nav-item" @click="closeMobileMenu">
            <span class="nav-icon">📖</span>
            <span>文档</span>
          </router-link>
          <a
            v-if="githubUrl"
            :href="githubUrl"
            class="mobile-nav-item"
            @click="closeMobileMenu"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg class="nav-icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8 16 3.58 12.42 0 8 0z"/>
            </svg>
            <span>GitHub</span>
          </a>
          
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

// 响应式状态
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)
const githubUrl = (import.meta.env.VITE_GITHUB_REPO_URL as string) || 'https://github.com/fanmengwen/VitePress-Lite'

// 路由实例
const router = useRouter()

// 计算第一个文档路径（优先使用重定向路径，否则使用第一个子路由路径）
const computeDocsHomePath = (routes: any[]): string => {
  const candidates = (routes || []).filter((route: any) => {
    return route?.path && route.path !== '/' && route.path !== '/:pathMatch(.*)*' && !route.hidden
  })

  if (candidates.length === 0) return '/'

  const first = candidates[0]

  if (typeof first.redirect === 'string') {
    return first.redirect
  }

  if (first.redirect && typeof first.redirect === 'object' && 'path' in first.redirect && first.redirect.path) {
    return first.redirect.path as string
  }

  if (Array.isArray(first.children) && first.children.length > 0) {
    const child = first.children.find((c: any) => c && !c.hidden && typeof c.path === 'string' && c.path)
    if (child?.path) return child.path as string
  }

  if (typeof first.path === 'string') return first.path

  return '/'
}

const docsHomePath = computed(() => computeDocsHomePath((router?.options?.routes as any[]) || []))

// 方法
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// 滚动监听
const handleScroll = () => {
  isScrolled.value = window.scrollY > 10
}

// 生命周期
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* === 导航容器基础样式 === */
.global-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: var(--transition-fast);
}

.global-nav.nav-scrolled {
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid var(--color-border-default);
  box-shadow: var(--shadow-md);
}

.nav-container {
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
  transition: var(--transition-fast);
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
  padding: var(--spacing-sm) var(--spacing-sm);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: var(--font-size-base);
  transition: var(--transition-fast);
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
  width: 50px;
  height: 2px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.nav-icon {
  font-size: var(--font-size-lg);
  line-height: 1;
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
  transition: var(--transition-fast);
}

.mobile-menu-toggle:hover {
  background: var(--color-primary-50);
}

.hamburger-line {
  width: 20px;
  height: 2px;
  background: var(--color-text-primary);
  border-radius: var(--radius-full);
  transition: var(--transition-fast);
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
  background: var(--color-bg-primary);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border-default);
  box-shadow: var(--shadow-lg);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
}

.mobile-menu-content {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
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
  transition: var(--transition-fast);
  margin-bottom: var(--spacing-sm);
}

.mobile-nav-item:hover {
  background: var(--color-primary-50);
  color: var(--color-primary);
}

.mobile-nav-section {
  margin-top: var(--spacing-2xl);
}

.mobile-nav-title {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
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
  transition: all var(--transition-fast);
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.95);
}

.dropdown-right.dropdown-enter-from,
.dropdown-right.dropdown-leave-to {
  transform: translateY(-10px) scale(0.95);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all var(--transition-fast);
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* === 暗色模式支持 === */
@media (prefers-color-scheme: dark) {
  .global-nav {
    background: rgba(17, 24, 39, 0.85);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .global-nav.nav-scrolled {
    background: rgba(17, 24, 39, 0.95);
  }

  .dropdown-menu {
    background: var(--color-bg-secondary);
    border-color: var(--color-border-dark);
  }

  .nav-menu-mobile {
    background: var(--color-bg-secondary);
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
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .dropdown-menu {
    width: calc(100vw - 2rem);
    left: 1rem;
    right: 1rem;
    transform: none;
  }

  .dropdown-menu.dropdown-right {
    left: 1rem;
    right: 1rem;
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
    animation: none;
    transform: none;
  }

  .nav-item:hover,
  .nav-logo:hover {
    transform: none;
  }
}

/* === 高对比度模式 === */
@media (prefers-contrast: high) {
  .global-nav {
    border-bottom-width: 2px;
  }

  .dropdown-menu {
    border-width: 2px;
  }

  .nav-item,
  .mobile-nav-item {
    border: 1px solid transparent;
  }

  .nav-item:hover,
  .mobile-nav-item:hover {
    border-color: var(--color-primary);
  }
}

</style>


