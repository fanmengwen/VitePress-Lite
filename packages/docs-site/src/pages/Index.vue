<template>
  <div class="home-page">
    <div class="page-header">
      <h1>📄 所有 Markdown 页面</h1>
      <p class="page-description">
        浏览文档，或点击右下角的 AI 助手获得智能问答
      </p>
    </div>
    <MarkdownList />
    
    <!-- AI 聊天窗口 -->
    <ChatbotWindow />
  </div>
</template>

<script setup lang="ts">
import MarkdownList from "../components/MarkdownList.vue";
import ChatbotWindow from "../components/ChatbotWindow.vue";
</script>

<style scoped>
.home-page {
  padding: 2rem;
  max-width: 960px;
  margin: 0 auto;
  position: relative;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

@media (prefers-color-scheme: dark) {
  .page-header h1 {
    color: #e0e0e0;
  }
}

.page-description {
  margin: 0;
  color: #666;
  font-size: 1.1rem;
  line-height: 1.6;
}

@media (prefers-color-scheme: dark) {
  .page-description {
    color: #999;
  }
}

@media (max-width: 768px) {
  .home-page {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.75rem;
  }
  
  .page-description {
    font-size: 1rem;
  }
}
</style>
