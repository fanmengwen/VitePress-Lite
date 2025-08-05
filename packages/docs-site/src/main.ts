// src/main.js
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { setupCodeBlockCopy } from './utils/codeBlockCopy'

const app = createApp(App)

app.use(router)

app.mount('#app')

// 初始化代码复制功能
document.addEventListener('DOMContentLoaded', () => {
  setupCodeBlockCopy()
})

// 路由切换时重新初始化代码复制功能
router.afterEach(() => {
  // 使用 nextTick 确保 DOM 已更新
  setTimeout(() => {
    setupCodeBlockCopy()
  }, 100)
})
