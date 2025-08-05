<template>
  <main>
    <router-view />
    <!-- 回到顶部按钮 -->
    <BackToTop />
  </main>
</template>

<script setup lang="ts">
import BackToTop from './components/BackToTop.vue';
</script>
