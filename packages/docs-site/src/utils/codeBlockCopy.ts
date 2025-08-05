/**
 * 代码块复制功能工具
 * 为 Markdown 页面的代码块添加一键复制功能
 */

interface CopyResult {
  success: boolean;
  message: string;
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<CopyResult>
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true, message: '已复制到剪贴板' };
    }
    
    // 回退到传统方法
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return { success: true, message: '已复制到剪贴板' };
    } else {
      throw new Error('复制失败');
    }
  } catch (error) {
    console.error('复制操作失败:', error);
    return { success: false, message: '复制失败，请手动复制' };
  }
}

/**
 * 显示复制结果提示
 * @param element 目标元素
 * @param result 复制结果
 */
function showCopyFeedback(element: HTMLElement, result: CopyResult) {
  const originalText = element.textContent || '复制代码';
  const originalColor = element.style.backgroundColor;
  
  // 更新按钮文本和样式
  element.textContent = result.message;
  element.style.backgroundColor = result.success 
    ? 'var(--color-success)' 
    : 'var(--color-error)';
  
  // 添加视觉反馈类
  element.classList.add(result.success ? 'copy-success' : 'copy-error');
  
  // 2秒后恢复原状
  setTimeout(() => {
    element.textContent = originalText;
    element.style.backgroundColor = originalColor;
    element.classList.remove('copy-success', 'copy-error');
  }, 2000);
}

/**
 * 为代码块添加复制功能
 * @param codeBlock 代码块元素
 */
function addCopyFunctionality(codeBlock: HTMLPreElement) {
  // 避免重复添加
  if (codeBlock.dataset.copyAdded === 'true') {
    return;
  }
  
  const code = codeBlock.querySelector('code');
  if (!code) return;
  
  // 创建复制按钮
  const copyBtn = document.createElement('button');
  copyBtn.className = 'code-copy-btn';
  copyBtn.textContent = '复制代码';
  copyBtn.setAttribute('aria-label', '复制代码到剪贴板');
  copyBtn.type = 'button';
  
  // 添加样式
  Object.assign(copyBtn.style, {
    position: 'absolute',
    top: 'var(--spacing-md)',
    right: 'var(--spacing-md)',
    background: 'var(--color-primary)',
    color: 'var(--color-text-inverse)',
    border: 'none',
    padding: 'var(--spacing-xs) var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-xs)',
    fontFamily: 'var(--font-family-sans)',
    cursor: 'pointer',
    transition: 'var(--transition-base)',
    opacity: '0.8',
    zIndex: '10',
    fontWeight: '500'
  });
  
  // 悬停效果
  copyBtn.addEventListener('mouseenter', () => {
    copyBtn.style.opacity = '1';
    copyBtn.style.transform = 'translateY(-1px)';
  });
  
  copyBtn.addEventListener('mouseleave', () => {
    copyBtn.style.opacity = '0.8';
    copyBtn.style.transform = 'translateY(0)';
  });
  
  // 点击复制功能
  copyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 获取代码文本（去除行号等额外内容）
    const codeText = code.textContent || '';
    const cleanCode = codeText.replace(/^\d+\s/gm, ''); // 移除行号
    
    const result = await copyToClipboard(cleanCode);
    showCopyFeedback(copyBtn, result);
    
    // 触发自定义事件
    const copyEvent = new CustomEvent('codeBlockCopied', {
      detail: { success: result.success, code: cleanCode }
    });
    document.dispatchEvent(copyEvent);
  });
  
  // 确保代码块有相对定位
  if (getComputedStyle(codeBlock).position === 'static') {
    codeBlock.style.position = 'relative';
  }
  
  // 添加按钮到代码块
  codeBlock.appendChild(copyBtn);
  codeBlock.dataset.copyAdded = 'true';
}

/**
 * 初始化页面中所有代码块的复制功能
 */
export function initCodeBlockCopy() {
  // 查找所有代码块
  const codeBlocks = document.querySelectorAll<HTMLPreElement>('pre code');
  
  codeBlocks.forEach(codeElement => {
    const preElement = codeElement.parentElement as HTMLPreElement;
    if (preElement && preElement.tagName === 'PRE') {
      addCopyFunctionality(preElement);
    }
  });
}

/**
 * 监听 DOM 变化，自动为新的代码块添加复制功能
 */
export function observeCodeBlocks() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // 检查添加的元素是否是代码块
          if (element.tagName === 'PRE') {
            const code = element.querySelector('code');
            if (code) {
              addCopyFunctionality(element as HTMLPreElement);
            }
          }
          
          // 检查子元素中的代码块
          const codeBlocks = element.querySelectorAll<HTMLPreElement>('pre code');
          codeBlocks.forEach(codeElement => {
            const preElement = codeElement.parentElement as HTMLPreElement;
            if (preElement && preElement.tagName === 'PRE') {
              addCopyFunctionality(preElement);
            }
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}

/**
 * 添加复制功能的 CSS 样式
 */
export function addCopyStyles() {
  const styleId = 'code-copy-styles';
  
  // 避免重复添加样式
  if (document.getElementById(styleId)) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .code-copy-btn.copy-success {
      background: var(--color-success) !important;
      transform: translateY(-1px) scale(1.05);
    }
    
    .code-copy-btn.copy-error {
      background: var(--color-error) !important;
      animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }
    
    .markdown-page .markdown-body pre {
      position: relative;
    }
    
    .markdown-page .markdown-body pre:hover .code-copy-btn {
      opacity: 1 !important;
    }
    
    @media (max-width: 768px) {
      .code-copy-btn {
        font-size: 10px !important;
        padding: 4px 8px !important;
        top: 8px !important;
        right: 8px !important;
      }
    }
    
    @media (prefers-reduced-motion: reduce) {
      .code-copy-btn,
      .code-copy-btn.copy-success,
      .code-copy-btn.copy-error {
        transition: none !important;
        animation: none !important;
        transform: none !important;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * 完整初始化代码复制功能
 */
export function setupCodeBlockCopy() {
  // 添加样式
  addCopyStyles();
  
  // 初始化现有代码块
  initCodeBlockCopy();
  
  // 监听新的代码块
  const observer = observeCodeBlocks();
  
  // 监听复制事件（可用于统计或其他功能）
  document.addEventListener('codeBlockCopied', (e: CustomEvent) => {
    const { success, code } = e.detail;
    console.log(`代码复制${success ? '成功' : '失败'}:`, code.substring(0, 50) + '...');
  });
  
  return observer;
} 