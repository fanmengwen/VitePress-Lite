<template>
  <div>
    <MarkdownArticle 
      :article="demoArticle"
      :navigation-links="navigationLinks"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MarkdownArticle from '../components/MarkdownArticle.vue';
import type { Post } from '@/api';

// 模拟文章数据
const demoArticle = ref<Post>({
  id: 1,
  title: '现代化 Vue.js 文档网站开发指南',
  content: `
    <h2>前言</h2>
    <p>在现代 Web 开发中，构建一个优秀的文档网站是非常重要的。本文将介绍如何使用 Vue.js 和现代化的设计理念来创建一个美观、易用的文档平台。</p>
    
    <h2>技术栈介绍</h2>
    <p>我们选择了以下技术栈来构建这个文档网站：</p>
    <ul>
      <li><strong>Vue.js 3</strong>：作为主要的前端框架</li>
      <li><strong>TypeScript</strong>：提供类型安全</li>
      <li><strong>Vite</strong>：作为构建工具</li>
      <li><strong>CSS Variables</strong>：实现设计系统</li>
    </ul>
    
    <h2>核心功能</h2>
    <blockquote>
      <p>一个优秀的文档网站应该具备良好的用户体验、清晰的信息架构和现代化的设计。</p>
    </blockquote>
    
    <h3>响应式设计</h3>
    <p>我们的文档网站采用了完全响应式的设计，确保在各种设备上都能提供最佳的阅读体验。</p>
    
    <h3>代码高亮</h3>
    <p>支持多种编程语言的语法高亮，并提供一键复制功能：</p>
    
    <pre><code class="language-javascript">// 示例 JavaScript 代码
const setupCodeBlockCopy = () => {
  const codeBlocks = document.querySelectorAll('pre code');
  
  codeBlocks.forEach(block => {
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制代码';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(block.textContent);
    };
    
    block.parentElement.appendChild(copyBtn);
  });
};

// 初始化
setupCodeBlockCopy();</code></pre>
    
    <h3>Vue 组件示例</h3>
    <pre><code class="language-vue">&lt;template&gt;
  &lt;div class="markdown-article-container"&gt;
    &lt;article class="markdown-article-card"&gt;
      &lt;header class="article-header"&gt;
        &lt;h1&gt;{{ article.title }}&lt;/h1&gt;
      &lt;/header&gt;
      &lt;div class="article-content"&gt;
        &lt;div v-html="article.content"&gt;&lt;/div&gt;
      &lt;/div&gt;
    &lt;/article&gt;
  &lt;/div&gt;
&lt;/template&gt;</code></pre>
    
    <h2>设计系统</h2>
    <p>我们建立了一套完整的设计系统，包括：</p>
    <ol>
      <li>颜色系统：主色调、语义色彩、文本颜色等</li>
      <li>间距系统：统一的边距和内边距规范</li>
      <li>字体系统：适合中英文混排的字体选择</li>
      <li>组件库：可复用的 UI 组件</li>
    </ol>
    
    <h2>总结</h2>
    <p>通过使用现代化的技术栈和设计理念，我们成功创建了一个美观、实用的文档网站。这个网站不仅具有良好的用户体验，还提供了强大的功能支持。</p>
  `,
  slug: 'modern-vue-documentation-guide',
  excerpt: '学习如何使用 Vue.js 和现代化设计理念构建优秀的文档网站',
  published: true,
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-16T14:20:00Z',
  author: {
    id: 1,
    name: '前端开发专家',
    email: 'developer@example.com'
  }
});

// 导航链接
const navigationLinks = ref({
  prev: {
    path: '/docs/getting-started',
    title: '快速开始'
  },
  next: {
    path: '/docs/advanced-features',
    title: '高级功能'
  }
});
</script> 