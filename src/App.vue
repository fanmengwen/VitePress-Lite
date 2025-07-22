<template>
  <header>
    <h1>My VitePress Clone</h1>
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/total">Index</router-link>
    </nav>
  </header>
  <main>
    <router-view /> </main>
</template>
<script setup lang="ts">
import { ref } from "vue";
import router from "./router"; // 引入路由

console.log('🦄  file: App.vue:18  currentRoute:', router)
</script>router