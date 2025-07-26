
<template>
  <router-link :to="path" class="card">
    <div class="title">📘 {{ title }}</div>
    <div class="path">{{ path }}</div>
  </router-link>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  path: string
}>()
</script>

<style scoped>
.card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1rem;
  background: #f9f9f9;
  transition: box-shadow 0.2s, transform 0.2s;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.title {
  font-size: 1.1rem;
  font-weight: bold;
}

.path {
  color: #888;
  font-size: 0.875rem;
}
</style>
