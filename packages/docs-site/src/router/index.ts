// src/router/index.js

// @ts-expect-error Temporary: type resolver in monorepo lints cannot locate vue-router types
import { createRouter, createWebHistory } from "vue-router";

import generatedRoutes from "virtual:pages";

import Simple404 from "../components/Simple404.vue";
import IndexPage from "../pages/Index.vue";
import KnowledgeBase from "../pages/KnowledgeBase.vue";

const staticRoutes = [
  {
    path: "/",
    title: "首页",
    component: IndexPage,
  },
  {
    path: "/kb",
    title: "知识库",
    component: KnowledgeBase,
  },
];

// 404 页面路由 - 必须放在最后，捕获所有未匹配的路由
const notFoundRoute = {
  path: "/:pathMatch(.*)*",
  name: "NotFound",
  title: "页面未找到",
  component: Simple404,
  hidden: true,
};

// 4. 合并静态路由和动态路由，404路由放在最后
const allRoutes = [...staticRoutes, ...generatedRoutes, notFoundRoute];

console.log("All combined routes:", allRoutes);

const router = createRouter({
  history: createWebHistory(),
  routes: allRoutes, // 使用合并后的完整路由表
  scrollBehavior(to, from, savedPosition) {
    // 如果有保存的位置（比如通过浏览器的前进/后退按钮），优先使用保存的位置
    if (savedPosition) {
      return savedPosition;
    }
    
    // 如果路由包含锚点（hash），滚动到对应元素
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 80, // 留出导航栏高度
      };
    }
    
    // 默认情况下滚动到页面顶部
    return {
      top: 0,
      left: 0,
      behavior: 'smooth'
    };
  },
});

// 全局路由守卫：确保页面跳转时滚动到顶部
router.afterEach((to, from) => {
  // 只在路由真正改变时处理滚动
  if (to.path !== from.path && !to.hash) {
    // 使用nextTick确保DOM更新完成
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto' // 改为auto，避免动画可能的干扰
      });
    }, 0);
  }
});

export default router;
