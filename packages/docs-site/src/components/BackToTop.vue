<template>
  <Transition name="back-to-top">
    <button
      v-show="isVisible"
      class="back-to-top-btn"
      @click="scrollToTop"
      :title="buttonTitle"
      :aria-label="buttonTitle"
      :class="{ 'btn-loading': isScrolling }"
    >
      <div class="btn-content">
        <!-- 滚动进度环 -->
        <svg class="progress-ring" width="48" height="48" viewBox="0 0 48 48">
          <circle
            class="progress-ring-bg"
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            opacity="0.2"
          />
          <circle
            class="progress-ring-progress"
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
            transform="rotate(-90 24 24)"
          />
        </svg>
        
        <!-- 箭头图标 -->
        <div class="arrow-icon" :class="{ 'arrow-loading': isScrolling }">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4L12 20M12 4L6 10M12 4L18 10"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>
      
      <!-- 悬浮提示 -->
      <div class="tooltip">{{ buttonTitle }}</div>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

// 响应式状态
const isVisible = ref(false);
const isScrolling = ref(false);
const scrollY = ref(0);
const documentHeight = ref(0);

// 配置选项
const showThreshold = 300; // 显示按钮的滚动阈值
const scrollDuration = 400; // 滚动动画持续时间

// 计算属性
const scrollProgress = computed(() => {
  if (documentHeight.value <= window.innerHeight) return 0;
  const maxScroll = documentHeight.value - window.innerHeight;
  return Math.min(scrollY.value / maxScroll, 1);
});

const buttonTitle = computed(() => {
  const progress = Math.round(scrollProgress.value * 100);
  return `回到顶部 (${progress}%)`;
});

// SVG 圆环相关计算
const radius = 20;
const circumference = 2 * Math.PI * radius;
const strokeDashoffset = computed(() => {
  return circumference - (scrollProgress.value * circumference);
});

// 滚动监听函数
const handleScroll = () => {
  const currentScrollY = window.scrollY;
  scrollY.value = currentScrollY;
  documentHeight.value = document.documentElement.scrollHeight;
  
  // 显示/隐藏按钮
  isVisible.value = currentScrollY > showThreshold;
};

// 平滑滚动到顶部
const scrollToTop = () => {
  if (isScrolling.value) return;
  
  isScrolling.value = true;
  const startY = window.scrollY;
  const startTime = performance.now();
  
  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / scrollDuration, 1);
    
    // 使用 easeOutCubic 缓动函数
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOutCubic(progress);
    
    const currentY = startY - (startY * easedProgress);
    window.scrollTo(0, currentY);
    
    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    } else {
      isScrolling.value = false;
    }
  };
  
  requestAnimationFrame(animateScroll);
};

// 防抖处理滚动事件
let scrollTimer: number | null = null;
const debouncedHandleScroll = () => {
  if (scrollTimer) {
    cancelAnimationFrame(scrollTimer);
  }
  scrollTimer = requestAnimationFrame(handleScroll);
};

// 键盘支持
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Home' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    scrollToTop();
  }
};

// 生命周期钩子
onMounted(() => {
  window.addEventListener('scroll', debouncedHandleScroll, { passive: true });
  window.addEventListener('keydown', handleKeydown);
  handleScroll(); // 初始检查
});

onUnmounted(() => {
  window.removeEventListener('scroll', debouncedHandleScroll);
  window.removeEventListener('keydown', handleKeydown);
  if (scrollTimer) {
    cancelAnimationFrame(scrollTimer);
  }
});
</script>

<style scoped>
.back-to-top-btn {
  position: fixed;
  bottom: var(--spacing-2xl);
  left: var(--spacing-2xl);
  z-index: var(--z-fixed);
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  transition: var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.back-to-top-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}

.back-to-top-btn:active {
  transform: translateY(0);
}

.back-to-top-btn:focus {
  outline: 2px solid var(--color-primary-light);
  outline-offset: 2px;
}

.btn-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* 进度环样式 */
.progress-ring {
  position: absolute;
  width: 48px;
  height: 48px;
  pointer-events: none;
}

.progress-ring-bg {
  opacity: 0.2;
}

.progress-ring-progress {
  transition: stroke-dashoffset var(--transition-base);
  filter: drop-shadow(0 0 2px currentColor);
}

/* 箭头图标样式 */
.arrow-icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-base);
}

.arrow-icon svg {
  transition: var(--transition-base);
}

.back-to-top-btn:hover .arrow-icon {
  transform: translateY(-2px);
}

.arrow-loading {
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* 悬浮提示 */
.tooltip {
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: var(--spacing-md);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 500;
  white-space: nowrap;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border-default);
  opacity: 0;
  pointer-events: none;
  transition: var(--transition-base);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.tooltip::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-left-color: var(--color-border-default);
}

.tooltip::before {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: -1px;
  border: 5px solid transparent;
  border-left-color: var(--color-bg-primary);
}

.back-to-top-btn:hover .tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(-4px);
}

/* 按钮加载状态 */
.btn-loading {
  pointer-events: none;
}

.btn-loading .progress-ring-progress {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 进入/离开动画 */
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: all var(--transition-base);
}

.back-to-top-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .back-to-top-btn {
    background: var(--color-primary);
    box-shadow: var(--shadow-xl);
  }
  
  .tooltip {
    background: var(--color-bg-secondary);
    border-color: var(--color-border-dark);
  }
  
  .tooltip::after {
    border-left-color: var(--color-border-dark);
  }
  
  .tooltip::before {
    border-left-color: var(--color-bg-secondary);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .back-to-top-btn {
    bottom: var(--spacing-xl);
    right: var(--spacing-xl);
    width: 48px;
    height: 48px;
  }
  
  .progress-ring {
    width: 40px;
    height: 40px;
    top: 4px;
    left: 4px;
  }
  
  .arrow-icon svg {
    width: 16px;
    height: 16px;
  }
  
  .tooltip {
    display: none; /* 移动端隐藏提示 */
  }
}

@media (max-width: 480px) {
  .back-to-top-btn {
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    width: 44px;
    height: 44px;
  }
  
  .progress-ring {
    width: 36px;
    height: 36px;
  }
  
  .arrow-icon svg {
    width: 14px;
    height: 14px;
  }
}

/* 可访问性增强 */
@media (prefers-reduced-motion: reduce) {
  .back-to-top-btn,
  .arrow-icon,
  .progress-ring-progress,
  .tooltip,
  .back-to-top-enter-active,
  .back-to-top-leave-active {
    transition: none;
    animation: none;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .back-to-top-btn {
    border: 2px solid var(--color-text-primary);
  }
  
  .progress-ring-bg {
    opacity: 0.5;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .back-to-top-btn {
    width: 52px;
    height: 52px;
  }
  
  .back-to-top-btn:hover {
    transform: none;
  }
  
  .tooltip {
    display: none;
  }
}
</style> 