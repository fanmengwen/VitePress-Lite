// src/utils/environment.ts

/**
 * 环境检测工具
 * 用于判断当前运行环境，以便提供适当的降级方案
 */

declare global {
  interface Window {
    __PRERENDERED__?: boolean;
    __ROUTE__?: string;
    __META__?: any;
    __CONTENT__?: any;
  }
}

export class EnvironmentDetector {
  /**
   * 检测是否为预渲染环境
   */
  static isPrerendered(): boolean {
    if (typeof window === 'undefined') return false;
    
    return !!(
      window.__PRERENDERED__ ||
      (typeof document !== 'undefined' && 
       document.documentElement.getAttribute('data-prerendered') === 'true')
    );
  }

  /**
   * 检测是否为静态托管环境（无后端API）
   */
  static isStaticHosting(): boolean {
    if (typeof location === 'undefined') return false;
    
    const hostname = location.hostname;
    const port = location.port;
    
    // 静态托管服务商的域名模式
    const staticHosts = [
      '.netlify.app',
      '.vercel.app', 
      '.github.io',
      '.surge.sh',
      '.firebase.app',
      '.cloudflare.com'
    ];
    
    // 本地静态服务器
    const localStaticPorts = ['4173', '3000', '8080', '8000'];
    
    // 检查是否为静态托管服务
    const isStaticHost = staticHosts.some(host => hostname.endsWith(host));
    
    // 检查是否为本地静态服务（通常端口不是3001这样的API端口）
    const isLocalStatic = (
      ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) &&
      localStaticPorts.includes(port)
    );
    
    return isStaticHost || isLocalStatic;
  }

  /**
   * 检测是否应该跳过API请求
   */
  static shouldSkipApiRequests(): boolean {
    return this.isPrerendered() || this.isStaticHosting();
  }

  /**
   * 检测当前的运行环境类型
   */
  static getEnvironmentType(): 'development' | 'production' | 'prerendered' | 'static' {
    if (this.isPrerendered()) {
      return 'prerendered';
    }
    
    if (this.isStaticHosting()) {
      return 'static';
    }
    
    if (typeof location !== 'undefined') {
      const hostname = location.hostname;
      if (['localhost', '127.0.0.1'].includes(hostname)) {
        return 'development';
      }
    }
    
    return 'production';
  }

  /**
   * 获取环境信息字符串（用于调试）
   */
  static getEnvironmentInfo(): string {
    const type = this.getEnvironmentType();
    const shouldSkip = this.shouldSkipApiRequests();
    const hostname = typeof location !== 'undefined' ? location.hostname : 'unknown';
    const port = typeof location !== 'undefined' ? location.port : 'unknown';
    
    return `Environment: ${type}, Skip API: ${shouldSkip}, Host: ${hostname}:${port}`;
  }

  /**
   * 在控制台输出环境信息
   */
  static logEnvironmentInfo(): void {
    const info = this.getEnvironmentInfo();
    const type = this.getEnvironmentType();
    
    const emoji = {
      development: '🔧',
      production: '🚀', 
      prerendered: '📄',
      static: '📁'
    };
    
    console.log(`${emoji[type]} ${info}`);
  }
}

// 为了方便使用，导出简化的函数
export const isPrerendered = () => EnvironmentDetector.isPrerendered();
export const isStaticHosting = () => EnvironmentDetector.isStaticHosting();
export const shouldSkipApiRequests = () => EnvironmentDetector.shouldSkipApiRequests();
export const getEnvironmentType = () => EnvironmentDetector.getEnvironmentType();

// 在开发环境下自动输出环境信息
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // 延迟执行，确保DOM加载完成
  setTimeout(() => {
    EnvironmentDetector.logEnvironmentInfo();
  }, 1000);
}
