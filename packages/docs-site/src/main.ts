// src/main.js
import './style.css'
import { createApp } from "vue";
import { createHead } from '@unhead/vue';
import "./styles/markdown-layout.css"; // 导入markdown布局样式

import App from './App.vue'
import router from './router'
import { setupCodeBlockCopy } from './utils/codeBlockCopy'

const app = createApp(App)


// 路由切换时重新初始化代码复制功能
router.afterEach(() => {
  // 使用 nextTick 确保 DOM 已更新
  setTimeout(() => {
    setupCodeBlockCopy()
  }, 100)
})
const head = createHead();

app.use(router);
app.use(head);
app.mount("#app");


// 初始化代码复制功能
document.addEventListener('DOMContentLoaded', () => {
  setupCodeBlockCopy()
})
