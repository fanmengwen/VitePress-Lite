<template>
  <aside class="side-nav">
    <div class="sidebar-body">
      <div class="brand-block">
        <router-link to="/" class="brand-link">
          <span class="brand-icon">🧠</span>
          <div class="brand-texts">
            <span class="brand-title">智识自答</span>
            <span class="brand-subtitle">文档驱动的 AI 助手</span>
          </div>
        </router-link>
      </div>

      <nav class="nav-links">
        <router-link to="/" class="nav-link" :class="{ active: route.path === '/' }">
          <span class="icon">💬</span>
          <span>对话空间</span>
        </router-link>
        <router-link to="/kb" class="nav-link" :class="{ active: route.path.startsWith('/kb') }">
          <span class="icon">📚</span>
          <span>知识库</span>
        </router-link>
        <a :href="githubUrl" class="nav-link" target="_blank" rel="noopener noreferrer">
          <span class="icon">🌐</span>
          <span>GitHub 仓库</span>
        </a>
      </nav>

      <section class="new-convo">
        <button class="new-convo-btn" :disabled="isCreating" @click="handleNewConversation">
          <span class="new-symbol">＋</span>
          <span>{{ isCreating ? '创建中...' : '新建对话' }}</span>
        </button>
        <p v-if="actionError" class="action-error">{{ actionError }}</p>
      </section>

      <section class="history-section">
        <header class="section-header">
          <span class="section-title">历史对话</span>
          <div class="section-actions">
            <button
              class="icon-button"
              :disabled="loading && !hasConversations"
              @click="handleRefresh"
              title="刷新对话列表"
            >
              ⟳
            </button>
          </div>
        </header>

        <div v-if="loading && !hasConversations" class="history-loading">
          <div class="skeleton" v-for="n in 3" :key="n"></div>
        </div>

        <ul v-else-if="hasConversations" class="history-list">
          <li
            v-for="item in conversations"
            :key="item.id"
            :class="['history-item', { active: item.id === activeConversationId }]"
          >
            <button class="history-button" @click="handleSelectConversation(item.id)">
              <div class="history-title" :title="item.title">
                {{ formatConversationTitle(item.title) }}
              </div>
              <div class="history-meta">{{ formatUpdatedAt(item.updated_at) }}</div>
            </button>
            <button
              class="delete-button"
              title="删除对话"
              @click.stop="handleDeleteConversation(item.id)"
            >
              ✕
            </button>
          </li>
        </ul>

        <div v-else class="history-empty">
          <p>暂无历史记录。点击上方按钮开始新对话。</p>
        </div>

        <p v-if="storeError" class="store-error">{{ storeError }}</p>
      </section>

      <section class="knowledge-section">
        <header class="section-header">
          <span class="section-title">知识库精选</span>
        </header>
        <p class="knowledge-desc">精选文档与笔记，辅助 AI 给出高质量回答。</p>
        <div class="knowledge-links">
          <button class="knowledge-button" @click="handleOpenKnowledgeBase">
            浏览全部知识库
          </button>
          <router-link class="knowledge-quick" to="/kb#articles">最新文章</router-link>
          <router-link class="knowledge-quick" to="/kb#overview">文档总览</router-link>
        </div>
      </section>
    </div>

    <footer class="sidebar-footer">
      <div class="user-info">
        <div class="avatar">🧑🏻‍💻</div>
        <div class="user-meta">
          <span class="user-name">单用户演示版</span>
          <span class="user-tag">本地运行</span>
        </div>
      </div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useConversations } from '@/composables/useConversations';

const router = useRouter();
const route = useRoute();

const {
  conversations,
  activeConversationId,
  loading,
  error,
  ensureLoaded,
  refresh,
  create,
  setActive,
  remove,
  hasConversations,
} = useConversations();

const actionError = ref<string | null>(null);
const isCreating = ref(false);

onMounted(() => {
  ensureLoaded();
});

const storeError = computed(() => error.value || null);

const formatUpdatedAt = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (diffMs < oneDay) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffMs < 7 * oneDay) {
    return date.toLocaleDateString('zh-CN', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const formatConversationTitle = (title: string) => {
  const safe = title.trim();
  if (safe.length === 0) return '未命名对话';
  return safe.length > 24 ? `${safe.slice(0, 24)}...` : safe;
};

const handleNewConversation = async () => {
  if (isCreating.value) return;
  actionError.value = null;
  isCreating.value = true;
  try {
    const convo = await create();
    if (route.path !== '/') {
      await router.push('/');
    }
    setActive(convo.id);
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '创建对话失败，请稍后重试。';
  } finally {
    isCreating.value = false;
  }
};

const handleSelectConversation = async (conversationId: string) => {
  actionError.value = null;
  setActive(conversationId);
  if (route.path !== '/') {
    await router.push('/');
  }
};

const handleRefresh = async () => {
  actionError.value = null;
  try {
    await refresh();
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '刷新失败';
  }
};

const handleDeleteConversation = async (conversationId: string) => {
  if (!window.confirm('确定要删除这条对话记录吗？')) return;
  actionError.value = null;
  try {
    await remove(conversationId);
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '删除失败，请重试。';
  }
};

const handleOpenKnowledgeBase = () => {
  actionError.value = null;
  if (route.path !== '/kb') {
    router.push('/kb');
  }
};

const githubUrl =
  (import.meta.env.VITE_GITHUB_REPO_URL as string) || 'https://github.com/fanmengwen/VitePress-Lite';
</script>

<style scoped>
.side-nav {
  width: 280px;
  padding: 20px 16px 12px;
  box-sizing: border-box;
  border-right: 1px solid var(--color-border-light);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.brand-block {
  margin-bottom: 20px;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.brand-icon {
  font-size: 28px;
}

.brand-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-weight: 800;
  font-size: 18px;
}

.brand-subtitle {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: background 0.2s ease;
}

.nav-link:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.nav-link.active {
  background: var(--color-primary-50);
  color: var(--color-primary);
}

.icon {
  width: 18px;
  text-align: center;
}

.new-convo {
  margin-bottom: 24px;
}

.new-convo-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 15px;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.new-convo-btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

.new-convo-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.new-symbol {
  font-size: 18px;
}

.action-error {
  color: #d04747;
  font-size: 12px;
  margin-top: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-button {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-tertiary);
}

.icon-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.history-section {
  margin-bottom: 28px;
}

.history-loading .skeleton {
  height: 52px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.04);
  margin-bottom: 10px;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  padding: 6px;
}

.history-item.active {
  border: 1px solid var(--color-primary-100);
  background: rgba(102, 126, 234, 0.12);
}

.history-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.history-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.history-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.delete-button {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--color-text-tertiary);
  cursor: pointer;
}

.delete-button:hover {
  background: rgba(0, 0, 0, 0.05);
}

.history-empty {
  padding: 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.03);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.store-error {
  margin-top: 12px;
  font-size: 12px;
  color: #d04747;
}

.knowledge-section {
  margin-bottom: 20px;
}

.knowledge-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.knowledge-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.knowledge-button {
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--color-border-light);
  background: #fff;
  cursor: pointer;
  font-size: 14px;
}

.knowledge-button:hover {
  border-color: var(--color-primary-100);
  color: var(--color-primary);
}

.knowledge-quick {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.knowledge-quick:hover {
  color: var(--color-primary);
}

.sidebar-footer {
  padding-top: 12px;
  border-top: 1px solid var(--color-border-light);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
}

.user-tag {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

@media (max-width: 960px) {
  .side-nav {
    display: none;
  }
}
</style>
