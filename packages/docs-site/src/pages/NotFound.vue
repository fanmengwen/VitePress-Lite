<template>
  <div class="not-found-container">
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
      <div class="floating-shape shape-4"></div>
    </div>

    <!-- 主要内容 -->
    <div class="not-found-content">
      <!-- 404动画数字 -->
      <div class="error-code">
        <div class="digit">
          <span class="digit-text">4</span>
          <div class="digit-glow"></div>
        </div>
        <div class="digit">
          <span class="digit-text">0</span>
          <div class="digit-glow"></div>
        </div>
        <div class="digit">
          <span class="digit-text">4</span>
          <div class="digit-glow"></div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div class="error-message">
        <h1 class="error-title">页面未找到</h1>
        <p class="error-description">
          抱歉，您访问的页面不存在。可能是链接错误，或者页面已被移动或删除。
        </p>
      </div>

      <!-- 搜索功能 -->
      <div class="search-section">
        <div class="search-input-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文档内容..."
            class="search-input"
            @keyup.enter="performSearch"
          />
          <button class="search-button" @click="performSearch">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="21 21l-4.35-4.35" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
        <p class="search-hint">尝试搜索相关内容，或从下方快捷链接开始</p>
      </div>

      <!-- 快捷导航 -->
      <div class="quick-navigation">
        <h3 class="nav-title">快速导航</h3>
        <div class="nav-grid">
          <router-link to="/" class="nav-card">
            <div class="nav-icon">🏠</div>
            <div class="nav-content">
              <h4>返回首页</h4>
              <p>回到主页查看所有内容</p>
            </div>
          </router-link>
          
          <router-link to="/docs" class="nav-card" v-if="hasDocsRoute">
            <div class="nav-icon">📚</div>
            <div class="nav-content">
              <h4>文档中心</h4>
              <p>浏览完整的文档内容</p>
            </div>
          </router-link>
          
          <a href="#" @click="goBack" class="nav-card">
            <div class="nav-icon">⬅️</div>
            <div class="nav-content">
              <h4>返回上页</h4>
              <p>回到之前访问的页面</p>
            </div>
          </a>
          
          <a href="https://github.com" class="nav-card" target="_blank" rel="noopener">
            <div class="nav-icon">💻</div>
            <div class="nav-content">
              <h4>GitHub</h4>
              <p>查看项目源代码</p>
            </div>
          </a>
        </div>
      </div>

      <!-- 热门页面推荐 -->
      <div class="popular-pages" v-if="popularPages.length > 0">
        <h3 class="section-title">热门页面</h3>
        <div class="pages-list">
          <router-link 
            v-for="page in popularPages" 
            :key="page.path" 
            :to="page.path" 
            class="page-link"
          >
            <span class="page-icon">{{ page.icon }}</span>
            <span class="page-title">{{ page.title }}</span>
            <span class="page-arrow">→</span>
          </router-link>
        </div>
      </div>

      <!-- 错误报告 -->
      <div class="error-report">
        <details class="error-details">
          <summary class="error-summary">
            <span class="summary-icon">🐛</span>
            <span class="summary-text">报告问题</span>
          </summary>
          <div class="error-info">
            <p><strong>请求路径:</strong> {{ currentPath }}</p>
            <p><strong>来源页面:</strong> {{ referrer || '直接访问' }}</p>
            <p><strong>时间:</strong> {{ currentTime }}</p>
            <p><strong>用户代理:</strong> {{ userAgent }}</p>
            <div class="report-actions">
              <button class="report-button" @click="copyErrorInfo">
                📋 复制错误信息
              </button>
              <a href="mailto:support@example.com" class="report-button">
                📧 发送反馈
              </a>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// 响应式数据
const searchQuery = ref('');
const currentPath = ref('');
const referrer = ref('');
const currentTime = ref('');
const userAgent = ref('');

// 检查是否有docs路由
const hasDocsRoute = computed(() => {
  return router.getRoutes().some(route => route.path === '/docs');
});

// 热门页面数据（可以从API获取或静态配置）
const popularPages = ref([
  { path: '/', title: '首页', icon: '🏠' },
  { path: '/hmr', title: 'HMR 热更新', icon: '🔥' },
  { path: '/setting', title: '项目配置', icon: '⚙️' },
  { path: '/total', title: 'Vite 知识体系', icon: '📖' },
]);

// 方法
const performSearch = () => {
  if (searchQuery.value.trim()) {
    // 这里可以集成实际的搜索功能
    console.log('搜索:', searchQuery.value);
    // 暂时跳转到首页并传递搜索参数
    router.push({ path: '/', query: { search: searchQuery.value } });
  }
};

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push('/');
  }
};

const copyErrorInfo = async () => {
  const errorInfo = `
错误路径: ${currentPath.value}
来源页面: ${referrer.value || '直接访问'}
时间: ${currentTime.value}
用户代理: ${userAgent.value}
  `.trim();

  try {
    await navigator.clipboard.writeText(errorInfo);
    alert('错误信息已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = errorInfo;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('错误信息已复制到剪贴板');
  }
};

// 初始化
onMounted(() => {
  currentPath.value = route.fullPath;
  referrer.value = document.referrer;
  currentTime.value = new Date().toLocaleString('zh-CN');
  userAgent.value = navigator.userAgent;

  // 过滤掉不存在的页面
  popularPages.value = popularPages.value.filter(page => {
    return router.getRoutes().some(route => route.path === page.path);
  });
});
</script>

<style scoped>
.not-found-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.floating-shape {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 100px;
  height: 100px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.shape-3 {
  width: 80px;
  height: 80px;
  top: 30%;
  right: 30%;
  animation-delay: 4s;
}

.shape-4 {
  width: 120px;
  height: 120px;
  bottom: 20%;
  left: 20%;
  animation-delay: 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

/* 主要内容 */
.not-found-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-3xl);
  padding: var(--spacing-4xl);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  text-align: center;
  max-width: 600px;
  width: 100%;
  position: relative;
  z-index: 1;
}

/* 404数字动画 */
.error-code {
  display: flex;
  justify-content: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-3xl);
}

.digit {
  position: relative;
  display: inline-block;
}

.digit-text {
  font-size: 8rem;
  font-weight: 900;
  color: transparent;
  background: linear-gradient(45deg, #667eea, #764ba2);
  background-clip: text;
  -webkit-background-clip: text;
  animation: pulse 2s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.digit-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, #667eea, #764ba2);
  filter: blur(20px);
  opacity: 0.3;
  animation: glow 2s ease-in-out infinite;
  z-index: 1;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* 错误信息 */
.error-message {
  margin-bottom: var(--spacing-3xl);
}

.error-title {
  font-size: var(--font-size-4xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.error-description {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0;
}

/* 搜索区域 */
.search-section {
  margin-bottom: var(--spacing-3xl);
  padding: var(--spacing-2xl);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--color-border-light);
}

.search-input-container {
  display: flex;
  margin-bottom: var(--spacing-md);
}

.search-input {
  flex: 1;
  padding: var(--spacing-lg);
  border: 2px solid var(--color-border-default);
  border-right: none;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  font-size: var(--font-size-base);
  outline: none;
  transition: var(--transition-base);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-button {
  padding: var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: 2px solid var(--color-primary);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  cursor: pointer;
  transition: var(--transition-base);
}

.search-button:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.search-icon {
  width: 20px;
  height: 20px;
}

.search-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

/* 快速导航 */
.quick-navigation {
  margin-bottom: var(--spacing-3xl);
}

.nav-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xl);
}

.nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.nav-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: inherit;
  transition: var(--transition-base);
}

.nav-card:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.nav-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.nav-content h4 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.nav-content p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

/* 热门页面 */
.popular-pages {
  margin-bottom: var(--spacing-3xl);
}

.section-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xl);
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.page-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  transition: var(--transition-base);
}

.page-link:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.page-icon {
  font-size: 1.5rem;
}

.page-title {
  flex: 1;
  font-weight: 500;
}

.page-arrow {
  font-size: 1.2rem;
  opacity: 0.5;
  transition: var(--transition-base);
}

.page-link:hover .page-arrow {
  opacity: 1;
  transform: translateX(4px);
}

/* 错误报告 */
.error-report {
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--spacing-xl);
}

.error-details {
  text-align: left;
}

.error-summary {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  transition: var(--transition-base);
}

.error-summary:hover {
  background: var(--color-bg-secondary);
}

.error-info {
  padding: var(--spacing-lg);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
  margin-top: var(--spacing-md);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

.error-info p {
  margin: var(--spacing-sm) 0;
}

.report-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.report-button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: var(--transition-base);
}

.report-button:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .not-found-container {
    padding: var(--spacing-lg);
  }

  .not-found-content {
    padding: var(--spacing-2xl);
  }

  .digit-text {
    font-size: 6rem;
  }

  .error-title {
    font-size: var(--font-size-3xl);
  }

  .nav-grid {
    grid-template-columns: 1fr;
  }

  .nav-card {
    padding: var(--spacing-lg);
  }

  .report-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .digit-text {
    font-size: 4rem;
  }

  .error-code {
    gap: var(--spacing-md);
  }

  .search-input-container {
    flex-direction: column;
  }

  .search-input {
    border-radius: var(--radius-lg);
    border-right: 2px solid var(--color-border-default);
    margin-bottom: var(--spacing-sm);
  }

  .search-button {
    border-radius: var(--radius-lg);
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .not-found-container {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }

  .not-found-content {
    background: rgba(30, 30, 46, 0.95);
  }

  .floating-shape {
    background: rgba(255, 255, 255, 0.05);
  }
}
</style>
