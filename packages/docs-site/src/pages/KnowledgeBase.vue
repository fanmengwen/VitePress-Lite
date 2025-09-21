<template>
  <div class="kb-page">
    <!-- <GlobalNav /> -->
    <SideNav />
    <main class="kb-main">
      <section class="kb-header">
        <h1 class="kb-title">知识库</h1>
        <p class="kb-subtitle">浏览与搜索本站所有文档与文章</p>
      </section>

      <section class="kb-content">
        <MarkdownList />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
// import GlobalNav from '@/components/common/GlobalNav.vue'
import SideNav from '@/components/common/SideNav.vue'
import MarkdownList from '@/components/MarkdownList.vue'
</script>

<style scoped>
.kb-page {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  background: var(--color-bg-primary);
}

.kb-main {
  flex: 1;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.kb-header {
  padding-top: 88px; /* account for fixed nav */
  padding-bottom: var(--spacing-xl);
  text-align: center;
}

.kb-title {
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 800;
  color: var(--color-text-primary);
}

.kb-subtitle {
  margin: 0.5rem 0 0;
  color: var(--color-text-secondary);
}

.kb-content {
  padding: 0 var(--spacing-lg) var(--spacing-3xl);
}

@media (max-width: 840px) {
  .kb-page {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }

  .kb-main {
    height: auto;
  }

  .kb-content {
    padding: 0 var(--spacing-md) var(--spacing-2xl);
  }
}
</style>


