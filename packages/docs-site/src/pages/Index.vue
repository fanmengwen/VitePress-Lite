<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-background">
        <div class="hero-gradient"></div>
        <div class="hero-shapes">
          <div class="shape shape-1"></div>
          <div class="shape shape-2"></div>
          <div class="shape shape-3"></div>
        </div>
      </div>
      
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-text">✨ 现代化文档平台</span>
        </div>
        
        <h1 class="hero-title">
          <span class="title-gradient">VitePress Lite</span>
          <br />
          知识管理新体验
        </h1>
        
        <p class="hero-description">
          基于 Vue.js 和 Vite 构建的现代化文档平台，支持 Markdown 解析、
          智能搜索和实时预览。让知识管理变得简单而高效。
        </p>
        
        <div class="hero-actions">
          <a href="#docs-section" class="btn-primary">
            <span class="btn-icon">📚</span>
            <span>浏览文档</span>
          </a>
          <button class="btn-secondary" @click="scrollToFeatures">
            <span class="btn-icon">🚀</span>
            <span>了解功能</span>
          </button>
        </div>
        
        <div class="hero-stats">
          <div class="stat-item">
            <div class="stat-number">{{ documentCount }}</div>
            <div class="stat-label">文档数量</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-number">{{ postCount }}</div>
            <div class="stat-label">文章总数</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-number">100%</div>
            <div class="stat-label">响应式</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section" id="features">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">核心功能</h2>
          <p class="section-subtitle">为现代化文档管理而生的强大功能</p>
        </div>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📝</div>
            <h3 class="feature-title">Markdown 支持</h3>
            <p class="feature-description">原生支持 Markdown 语法，支持代码高亮、表格、引用等丰富格式</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">🔍</div>
            <h3 class="feature-title">智能搜索</h3>
            <p class="feature-description">基于内容的全文搜索，快速定位所需信息</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">💬</div>
            <h3 class="feature-title">AI 助手</h3>
            <p class="feature-description">集成智能问答助手，随时获得文档相关的帮助</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3 class="feature-title">响应式设计</h3>
            <p class="feature-description">完美适配各种设备，提供一致的阅读体验</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3 class="feature-title">极速体验</h3>
            <p class="feature-description">基于 Vite 构建，享受毫秒级的开发和访问体验</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">🎨</div>
            <h3 class="feature-title">现代设计</h3>
            <p class="feature-description">简洁优雅的界面设计，专注内容阅读体验</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Documents Section -->
    <section class="docs-section" id="docs-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">📚 文档中心</h2>
          <p class="section-subtitle">浏览所有可用的文档和文章</p>
        </div>
        
        <MarkdownList />
      </div>
    </section>
    
    <!-- AI 聊天窗口 -->
    <ChatbotWindow />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MarkdownList from "../components/MarkdownList.vue";
import ChatbotWindow from "../components/ChatbotWindow.vue";
import usePostsData from "@/composables/usePostsData";
import router from "../router";

// 获取文档和文章数据用于统计
const postsData = usePostsData();

const documentCount = computed(() => {
  const routes = (router?.options?.routes as any[]) || [];
  return routes.filter((route) => route.path !== "/" && route.title).length;
});

const postCount = computed(() => {
  return postsData.posts.value.length;
});

// 平滑滚动到功能区域
const scrollToFeatures = () => {
  const element = document.getElementById('features');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--color-bg-primary);
}

/* === Hero Section === */
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.hero-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 20%, var(--color-primary-50) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, var(--color-info) 0%, transparent 50%),
              radial-gradient(circle at 20% 80%, var(--color-primary-100) 0%, transparent 50%);
  opacity: 0.6;
}

.hero-shapes {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, var(--color-primary-100), var(--color-primary-50));
  filter: blur(1px);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 300px;
  height: 300px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 200px;
  height: 200px;
  top: 60%;
  right: 10%;
  animation-delay: 2s;
}

.shape-3 {
  width: 150px;
  height: 150px;
  bottom: 20%;
  left: 50%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  text-align: center;
}

.hero-badge {
  display: inline-block;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
}

.badge-text {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-primary);
}

.hero-title {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 800;
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-xl);
  color: var(--color-text-primary);
}

.title-gradient {
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: var(--font-size-xl);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-3xl);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  display: flex;
  gap: var(--spacing-lg);
  justify-content: center;
  align-items: center;
  margin-bottom: var(--spacing-4xl);
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-2xl);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-lg);
  font-weight: 600;
  text-decoration: none;
  transition: var(--transition-base);
  border: none;
  cursor: pointer;
  box-shadow: var(--shadow-md);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-secondary {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 2px solid var(--color-border-default);
}

.btn-secondary:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-icon {
  font-size: var(--font-size-xl);
}

.hero-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-2xl);
  padding: var(--spacing-xl);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--color-border-default);
}

/* === Features Section === */
.features-section {
  padding: var(--spacing-5xl) 0;
  background: var(--color-bg-secondary);
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-4xl);
}

.section-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.section-subtitle {
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: var(--line-height-relaxed);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-2xl);
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: var(--color-bg-primary);
  padding: var(--spacing-2xl);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border-light);
  transition: var(--transition-base);
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-primary-100);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-lg);
  filter: grayscale(20%);
}

.feature-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.feature-description {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0;
}

/* === Documents Section === */
.docs-section {
  padding: var(--spacing-5xl) 0;
  background: var(--color-bg-primary);
}

/* === 响应式设计 === */
@media (max-width: 768px) {
  .hero-content {
    padding: 0 var(--spacing-md);
  }

  .hero-actions {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }

  .hero-stats {
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
  }

  .stat-divider {
    width: 40px;
    height: 1px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }

  .features-section,
  .docs-section {
    padding: var(--spacing-3xl) 0;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-description {
    font-size: var(--font-size-lg);
  }

  .hero-badge {
    margin-bottom: var(--spacing-lg);
  }

  .feature-card {
    padding: var(--spacing-xl);
  }

  .section-title {
    font-size: var(--font-size-2xl);
  }
}

/* === Smooth scroll enhancement === */
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  
  .shape {
    animation: none;
  }
}
</style>
