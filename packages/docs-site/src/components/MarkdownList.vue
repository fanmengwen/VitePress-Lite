<template>
  <div class="markdown-grid">
    <MarkdownCard
      v-for="item in routeList"
      :key="item.path"
      :title="item.title"
      :path="item.path"
    />
  </div>
</template>

<script setup lang="ts">
import MarkdownCard from './MarkdownCard.vue'
import router from '../router'

interface RouteRecordRaw {
  path: string;
  title: string;
  children?: RouteRecordRaw[];
}

const routeList = router?.options?.routes as RouteRecordRaw[];

</script>

<style scoped>
.markdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
</style>
