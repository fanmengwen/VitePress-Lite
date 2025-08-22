// src/main.js
import './style.css'
import { createApp } from "vue";
import { createHead } from '@unhead/vue';
import "./styles/markdown-layout.css"; // 导入markdown布局样式

import App from './App.vue'
import router from './router'
import { setupCodeBlockCopy } from './utils/codeBlockCopy'
import scrollPlugin from './plugins/scrollPlugin'

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

// 暂时禁用滚动插件，使用路由器自带的滚动行为
// app.use(scrollPlugin, {
//   forceScroll: true,
//   delay: 0,
//   debug: true // 开启调试模式，可以在控制台看到滚动日志
// });

app.mount("#app");


// 初始化代码复制功能
document.addEventListener('DOMContentLoaded', () => {
  setupCodeBlockCopy()
})
