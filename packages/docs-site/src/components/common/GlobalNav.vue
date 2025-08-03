<template>
  <header class="global-nav">
    <nav>
      <router-link
        v-for="route in visibleRoutes"
        :key="route.path"
        :to="route.path"
        class="nav-link"
        active-class="active"
      >
        {{ route.title }}
      </router-link>
    </nav>
  </header>
</template>

<script setup lang="ts">
import router from "../../router";

// 可以根据需要过滤或分组
const visibleRoutes = router.options.routes;
</script>

<style scoped>
.global-nav {
  background-color: #2d2d2d;
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: center;
  border-bottom: 1px solid #444;
}

nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-link {
  color: #eee;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #42b983;
}

.active {
  color: #42b983;
  border-bottom: 2px solid #42b983;
}
</style>
