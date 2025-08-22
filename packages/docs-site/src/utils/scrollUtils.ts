/**
 * 滚动相关工具函数
 */

export interface ScrollOptions {
  /** 滚动目标位置 */
  top?: number;
  /** 水平滚动位置 */
  left?: number;
  /** 滚动行为 */
  behavior?: 'auto' | 'smooth';
  /** 延迟执行时间（毫秒） */
  delay?: number;
}

/**
 * 滚动到页面顶部
 * @param options 滚动选项
 */
export function scrollToTop(options: ScrollOptions = {}) {
  const {
    top = 0,
    left = 0,
    behavior = 'smooth',
    delay = 0
  } = options;

  const performScroll = () => {
    window.scrollTo({
      top,
      left,
      behavior
    });
  };

  if (delay > 0) {
    setTimeout(performScroll, delay);
  } else {
    performScroll();
  }
}

/**
 * 滚动到指定元素
 * @param element 目标元素或选择器
 * @param options 滚动选项
 */
export function scrollToElement(
  element: HTMLElement | string, 
  options: ScrollOptions = {}
) {
  const {
    behavior = 'smooth',
    delay = 0
  } = options;

  const performScroll = () => {
    let targetElement: HTMLElement | null;

    if (typeof element === 'string') {
      targetElement = document.querySelector(element);
    } else {
      targetElement = element;
    }

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior,
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  if (delay > 0) {
    setTimeout(performScroll, delay);
  } else {
    performScroll();
  }
}

/**
 * 获取当前滚动位置
 */
export function getScrollPosition() {
  return {
    x: window.pageXOffset || document.documentElement.scrollLeft,
    y: window.pageYOffset || document.documentElement.scrollTop
  };
}

/**
 * 检查元素是否在视口中
 * @param element 目标元素
 * @param threshold 可见性阈值 (0-1)
 */
export function isElementInViewport(element: HTMLElement, threshold = 0) {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const verticalVisible = rect.top < windowHeight && rect.bottom > 0;
  const horizontalVisible = rect.left < windowWidth && rect.right > 0;

  if (threshold <= 0) {
    return verticalVisible && horizontalVisible;
  }

  const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
  const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
  const visibleArea = visibleHeight * visibleWidth;
  const totalArea = rect.height * rect.width;

  return visibleArea / totalArea >= threshold;
}

/**
 * 节流函数 - 用于滚动事件监听
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = window.setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 防抖函数 - 用于滚动结束检测
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 平滑滚动到指定位置（自定义缓动效果）
 * @param targetY 目标Y位置
 * @param duration 动画持续时间（毫秒）
 * @param easing 缓动函数
 */
export function smoothScrollTo(
  targetY: number,
  duration = 500,
  easing = (t: number) => t * (2 - t) // easeOutQuad
) {
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  const startTime = performance.now();

  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    
    window.scrollTo(0, startY + distance * easedProgress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * 保存滚动位置到 sessionStorage
 * @param key 存储键名
 */
export function saveScrollPosition(key: string) {
  const position = getScrollPosition();
  sessionStorage.setItem(key, JSON.stringify(position));
}

/**
 * 从 sessionStorage 恢复滚动位置
 * @param key 存储键名
 * @param options 滚动选项
 */
export function restoreScrollPosition(key: string, options: ScrollOptions = {}) {
  const saved = sessionStorage.getItem(key);
  if (saved) {
    try {
      const position = JSON.parse(saved);
      scrollToTop({
        top: position.y,
        left: position.x,
        ...options
      });
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to restore scroll position:', error);
    }
  }
}
