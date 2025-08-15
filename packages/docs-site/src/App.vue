<template>
  <main>
    <router-view />
    <!-- 回到顶部按钮 -->
    <BackToTop />
  </main>
</template>

<script setup lang="ts">
import BackToTop from './components/BackToTop.vue';
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSEO } from './composables/useSEO'

const route = useRoute()

// 基于当前路由动态设置SEO信息
const seoMeta = computed(() => {
  const routeMeta = route.meta || {}
  
  return {
    title: (routeMeta.title as string) || 'VitePress Lite - 现代化文档站点',
    description: (routeMeta.description as string) || 'VitePress Lite - 基于Vite + Vue 3的轻量级文档站点解决方案',
    keywords: (routeMeta.keywords as string) || 'vite,vue,documentation,markdown,前端,开发工具',
    author: (routeMeta.author as string) || 'VitePress Lite Team'
  }
})

// 应用SEO设置
useSEO(seoMeta)
</script>
