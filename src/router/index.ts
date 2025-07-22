// src/router/index.js

import { createRouter, createWebHistory } from "vue-router";

import routes from "virtual:pages";
console.log("Generated Routes:", routes);

const router = createRouter({
  history: createWebHistory(),
  routes, // 使用动态生成的路由
});

export default router;
