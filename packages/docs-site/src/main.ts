// src/main.js
import { createApp } from "vue";
import "./styles/markdown-layout.css"; // 导入markdown布局样式
import App from "./App.vue";
import router from "./router"; // 引入路由

createApp(App).use(router).mount("#app"); // 挂载
