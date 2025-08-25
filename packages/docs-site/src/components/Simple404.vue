<template>
  <div class="error-page">
    <div class="error-content">
      <!-- 404图标 -->
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 32 32"><g fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 17.5v-8M29 16a13 13 0 1 1-26 0a13 13 0 0 1 26 0Z"/><path fill="currentColor" d="M17 22a1 1 0 1 1-2 0a1 1 0 0 1 2 0Z"/></g></svg>
      </div>
      
      <!-- 错误信息 -->
      <h1 class="error-title">404</h1>
      <h2 class="error-subtitle">页面未找到</h2>
      <p class="error-description">
        抱歉，您访问的页面不存在或已被移动。
      </p>
      
      <!-- 操作按钮 -->
      <div class="error-actions">
        <router-link to="/" class="btn btn-primary">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          返回首页
        </router-link>
        <button @click="goBack" class="btn btn-secondary">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          返回上页
        </button>
      </div>
      
      <!-- 当前路径信息 -->
      <div class="error-info">
        <p>请求路径: <code>{{ $route.fullPath }}</code></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push('/');
  }
};
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
  padding: var(--spacing-xl);
}

.error-content {
  text-align: center;
  max-width: 500px;
  padding: var(--spacing-3xl);
  background: var(--color-bg-primary);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border-light);
}

.error-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-xl);
  color: var(--color-danger);
  opacity: 0.8;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-title {
  font-size: 4rem;
  font-weight: 900;
  color: var(--color-danger);
  margin: 0 0 var(--spacing-lg) 0;
  background: linear-gradient(45deg, var(--color-danger), var(--color-warning));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.error-subtitle {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-lg) 0;
}

.error-description {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0 0 var(--spacing-2xl) 0;
}

.error-actions {
  display: flex;
  gap: var(--spacing-lg);
  justify-content: center;
  margin-bottom: var(--spacing-2xl);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-xl);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: var(--transition-base);
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-default);
}

.btn-secondary:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}

.error-info {
  padding: var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
}

.error-info p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.error-info code {
  font-family: var(--font-family-mono);
  background: var(--color-bg-tertiary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-page {
    padding: var(--spacing-lg);
  }

  .error-content {
    padding: var(--spacing-2xl);
  }

  .error-title {
    font-size: 3rem;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
  }

  .btn {
    width: 100%;
    max-width: 200px;
  }
}

@media (max-width: 480px) {
  .error-title {
    font-size: 2.5rem;
  }

  .error-subtitle {
    font-size: var(--font-size-xl);
  }
}
</style>
