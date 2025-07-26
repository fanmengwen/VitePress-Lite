<template>
  <div class="home-page">
    <h1>📄 所有 Markdown 页面</h1>
    <MarkdownList />
  </div>
</template>

<script setup lang="ts">
import MarkdownList from '../components/MarkdownList.vue'
</script>

<style scoped>
.home-page {
  padding: 2rem;
  max-width: 960px;
  margin: 0 auto;
}
</style>
