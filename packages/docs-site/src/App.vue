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
    title: (routeMeta.title as string) || 'DocuMind | AI-Powered Document Q&A Platform',
    description: (routeMeta.description as string) || 'DocuMind is a cutting-edge AI Q&A platform. It deeply understands your private knowledge bases and local documents to provide precise, fast answers through natural language conversation, unlocking the full potential of your knowledge',
    keywords: (routeMeta.keywords as string) || 'vite,vue,documentation,markdown,前端,开发工具',
    author: (routeMeta.author as string) || 'VitePress Lite Team'
  }
})

// 应用SEO设置
useSEO(seoMeta)
</script>
