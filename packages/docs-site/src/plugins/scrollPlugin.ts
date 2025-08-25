/**
 * 滚动行为插件
 * 确保路由跳转时页面正确滚动到顶部
 */

import type { App } from 'vue';
import type { Router } from 'vue-router';

export interface ScrollPluginOptions {
  /** 是否启用强制滚动 */
  forceScroll?: boolean;
  /** 滚动延迟时间（毫秒） */
  delay?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

class ScrollManager {
  private options: Required<ScrollPluginOptions>;
  private scrollTimeouts: number[] = [];

  constructor(options: ScrollPluginOptions = {}) {
    this.options = {
      forceScroll: true,
      delay: 0,
      debug: false,
      ...options
    };
  }

  /**
   * 强制滚动到顶部
   */
  forceScrollToTop() {
    this.clearAllTimeouts();
    
    if (this.options.debug) {
      console.log('[ScrollPlugin] 强制滚动到顶部');
    }

    // 立即滚动（无动画）
    this.immediateScrollToTop();

    // 延迟滚动（多次尝试）
    const delays = [0, 10, 50, 100, 200, 500];
    delays.forEach(delay => {
      const timeoutId = window.setTimeout(() => {
        this.immediateScrollToTop();
      }, delay);
      this.scrollTimeouts.push(timeoutId);
    });

    // 最后执行平滑滚动
    const smoothTimeoutId = window.setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }, 600);
    this.scrollTimeouts.push(smoothTimeoutId);
  }

  /**
   * 立即滚动到顶部（无动画）
   */
  private immediateScrollToTop() {
    // 多种方式确保滚动成功
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // 强制重置所有可滚动容器
    const scrollableElements = document.querySelectorAll('[scrollTop]');
    scrollableElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.scrollTop = 0;
      }
    });
  }

  /**
   * 清除所有滚动相关的定时器
   */
  private clearAllTimeouts() {
    this.scrollTimeouts.forEach(id => window.clearTimeout(id));
    this.scrollTimeouts = [];
  }

  /**
   * 安装路由监听器
   */
  installRouterWatcher(router: Router) {
    // 路由跳转前
    router.beforeEach((to, from, next) => {
      if (this.options.debug) {
        console.log('[ScrollPlugin] 路由跳转:', from.path, '->', to.path);
      }
      next();
    });

    // 路由跳转后
    router.afterEach((to, from) => {
      // 如果有hash，不处理（交给原生滚动行为）
      if (to.hash) {
        return;
      }

      if (this.options.forceScroll) {
        if (this.options.delay > 0) {
          setTimeout(() => this.forceScrollToTop(), this.options.delay);
        } else {
          this.forceScrollToTop();
        }
      }
    });
  }

  /**
   * 监听Vue组件更新
   */
  onComponentUpdated() {
    // 组件更新后也尝试滚动
    setTimeout(() => {
      if (window.scrollY > 100) { // 只有当前不在顶部时才强制滚动
        this.forceScrollToTop();
      }
    }, 100);
  }
}

export default {
  install(app: App, options: ScrollPluginOptions = {}) {
    const scrollManager = new ScrollManager(options);
    
    // 提供全局访问
    app.config.globalProperties.$scrollToTop = () => scrollManager.forceScrollToTop();
    app.provide('scrollManager', scrollManager);

    // 全局混入，监听组件更新
    app.mixin({
      updated() {
        // 只在路由组件中处理
        if (this.$route && this.$router) {
          scrollManager.onComponentUpdated();
        }
      }
    });

    // 如果有路由器，安装路由监听器
    const router = app.config.globalProperties.$router;
    if (router) {
      scrollManager.installRouterWatcher(router);
    }
  }
};

// 导出类型
export type { ScrollManager };
