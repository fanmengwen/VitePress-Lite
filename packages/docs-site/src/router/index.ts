// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';


import generatedRoutes from 'virtual:pages';

import IndexPage from '../pages/Index.vue';

const staticRoutes = [
  {
    path: '/',
    title: 'Home',
    component: IndexPage,
  },
  // { path: '/login', name: 'Login', component: () => import('../pages/Login.vue') },
];

// 4. 合并静态路由和动态路由
const allRoutes = [...staticRoutes, ...generatedRoutes];

console.log('All combined routes:', allRoutes);

const router = createRouter({
  history: createWebHistory(),
  routes: allRoutes, // 使用合并后的完整路由表
});

export default router;