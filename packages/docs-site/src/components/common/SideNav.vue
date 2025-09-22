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
        <button class="nav-link" :class="{ active: isCreating }" :disabled="isCreating" @click="handleNewConversation">
          <span class="icon">💬</span>
          <span>{{ isCreating ? '创建中...' : '新建对话' }}</span>
        </button>
        <router-link to="/kb" class="nav-link" :class="{ active: route.path.startsWith('/kb') }">
          <span class="icon">📚</span>
          <span>知识库</span>
        </router-link>
        <a :href="githubUrl" class="nav-link" target="_blank" rel="noopener noreferrer">
          <span class="icon">🌐</span>
          <span>GitHub 仓库</span>
        </a>
      </nav>


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

        <ul v-else-if="hasConversations || isDrafting" class="history-list">
          <li
            v-if="isDrafting"
            class="history-item draft active"
          >
            <div class="history-button" @click="handleSelectDraft">
              <div class="history-title">新的对话</div>
              <div class="history-meta">等待你的问题…</div>
            </div>
          </li>
          <li
            v-for="item in conversations"
            :key="item.id"
            :class="['history-item', { active: route.path === '/' && item.id === activeConversationId }]"
          >
            <div class="history-button" @click="handleSelectConversation(item.id)">
              <div class="history-title" :title="item.title">
                {{ formatConversationTitle(item.title) }}
              </div>
              <div class="history-meta">{{ formatUpdatedAt(item.updated_at) }}</div>
            </div>
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
        <!-- <div class="knowledge-links">
          <button class="knowledge-button" @click="handleOpenKnowledgeBase">
            浏览全部知识库
          </button>
          <router-link class="knowledge-quick" to="/kb#articles">最新文章</router-link>
          <router-link class="knowledge-quick" to="/kb#overview">文档总览</router-link>
        </div> -->
      </section>
    </div>

    <footer class="sidebar-footer">
      <div class="user-info">
        <div class="avatar">🧑🏻‍💻</div>
        <div class="user-meta">
          <span class="user-name">游客用户</span>
        </div>
      </div>
    </footer>
    <ConfirmModal
      v-model="showDeleteModal"
      title="删除对话"
      message="此操作无法撤销，确定要删除该对话吗？"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="confirmDelete"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useConversations } from '@/composables/useConversations';
import ConfirmModal from './ConfirmModal.vue';

const router = useRouter();
const route = useRoute();

const {
  conversations,
  activeConversationId,
  loading,
  error,
  ensureLoaded,
  refresh,
  setActive,
  remove,
  hasConversations,
  isDrafting,
} = useConversations();

const actionError = ref<string | null>(null);
const showDeleteModal = ref(false);
const pendingDeleteId = ref<string | null>(null);
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
    if (route.path !== '/') {
      await router.push('/');
    }
    setActive(null);
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

const handleSelectDraft = async () => {
  actionError.value = null;
  setActive(null);
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

const handleDeleteConversation = (conversationId: string) => {
  actionError.value = null;
  pendingDeleteId.value = conversationId;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!pendingDeleteId.value) return;
  actionError.value = null;
  try {
    await remove(pendingDeleteId.value);
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '删除失败，请重试。';
  } finally {
    showDeleteModal.value = false;
    pendingDeleteId.value = null;
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
  padding: 22px 20px 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100vh;
  color: var(--color-text-primary);
  background: linear-gradient(182deg, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0.18) 100%);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 22px;
  backdrop-filter: saturate(160%) blur(calc(var(--glass-blur) - 6px));
  -webkit-backdrop-filter: saturate(160%) blur(calc(var(--glass-blur) - 6px));
  box-shadow: 0 26px 70px -28px rgba(12, 26, 57, 0.4);
  position: relative;
  overflow: hidden;
}

.side-nav::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0) 55%),
    radial-gradient(70% 70% at 12% 16%, rgba(120, 187, 255, 0.24) 0%, rgba(120, 187, 255, 0) 70%);
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.68;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%);
}

.brand-block {
  margin-bottom: 26px;
  position: relative;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  color: inherit;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.22);
  box-shadow: 0 18px 36px rgba(10, 132, 255, 0.18);
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
  position: relative;
  overflow: hidden;
}

.brand-link::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 55%);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.brand-link:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.32);
  box-shadow: 0 24px 48px rgba(10, 132, 255, 0.26);
}

.brand-link:hover::after {
  opacity: 1;
}

.brand-icon {
  font-size: 28px;
  text-shadow: 0 12px 34px rgba(10, 132, 255, 0.32);
}

.brand-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.01em;
}

.brand-subtitle {
  font-size: 12px;
  color: rgba(66, 80, 103, 0.7);
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  text-decoration: none;
  color: rgba(66, 80, 103, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.26);
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base), color var(--transition-base), border-color var(--transition-base);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.16);
}

.nav-link:disabled {
  opacity: 0.6;
  cursor: progress;
}

.nav-link:hover:not(:disabled) {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.34);
  color: var(--color-text-primary);
  border-color: rgba(255, 255, 255, 0.42);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
}

.nav-link.active {
  background: rgba(120, 187, 255, 0.2);
  color: var(--color-primary);
  border-color: rgba(10, 132, 255, 0.38);
  box-shadow: 0 28px 56px rgba(10, 132, 255, 0.22);
}

.icon {
  width: 18px;
  text-align: center;
  font-size: 16px;
}

.action-error {
  color: #ff453a;
  font-size: 12px;
  margin-top: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  font-weight: 700;
  font-size: 14px;
  color: rgba(66, 80, 103, 0.78);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-button {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
  color: rgba(66, 80, 103, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-base), background var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}

.icon-button:hover:not(:disabled) {
  background: rgba(10, 132, 255, 0.18);
  color: var(--color-primary);
  box-shadow: 0 18px 34px rgba(10, 132, 255, 0.18);
  transform: translateY(-1px);
}

.icon-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.history-section {
  margin-bottom: 32px;
}

.history-loading .skeleton {
  height: 54px;
  border-radius: 16px;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.36) 50%, rgba(255, 255, 255, 0.12) 100%);
  background-size: 200% 100%;
  margin-bottom: 12px;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.26);
  border-radius: 16px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base), background var(--transition-base);
}

.history-item:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.32);
  box-shadow: 0 22px 46px rgba(15, 23, 42, 0.16);
}

.history-item.active {
  background: rgba(120, 187, 255, 0.22);
  border-color: rgba(10, 132, 255, 0.4);
  box-shadow: 0 24px 52px rgba(10, 132, 255, 0.22);
}

.history-item.draft {
  border-style: dashed;
  background: rgba(120, 187, 255, 0.16);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.32);
}

.history-item.draft .history-title {
  color: var(--color-primary);
}

.history-item.draft .history-meta {
  color: rgba(10, 132, 255, 0.9);
  font-style: italic;
}

.history-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 0 8px;
  border: none;
  background: transparent;
  box-shadow: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.history-button:hover .history-title {
  color: var(--color-primary);
}

.history-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.history-meta {
  font-size: 12px;
  color: rgba(106, 116, 135, 0.8);
}

.delete-button {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  color: rgba(66, 80, 103, 0.65);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-base), color var(--transition-base), transform var(--transition-base), box-shadow var(--transition-base);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}

.delete-button:hover {
  background: rgba(255, 69, 58, 0.12);
  border-color: rgba(255, 69, 58, 0.28);
  color: #ff453a;
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgba(255, 69, 58, 0.16);
}

.history-empty {
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 13px;
  color: rgba(66, 80, 103, 0.75);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.store-error {
  margin-top: 14px;
  font-size: 12px;
  color: #ff453a;
  background: rgba(255, 69, 58, 0.12);
  border-radius: 10px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 69, 58, 0.22);
}

.knowledge-section {
  margin-bottom: 24px;
}

.knowledge-desc {
  font-size: 13px;
  color: rgba(66, 80, 103, 0.75);
  margin-bottom: 14px;
}

.knowledge-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.knowledge-button {
  height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.24);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.knowledge-button:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.34);
  box-shadow: 0 24px 44px rgba(15, 23, 42, 0.18);
}

.knowledge-quick {
  font-size: 13px;
  color: rgba(66, 80, 103, 0.78);
  transition: color var(--transition-base);
}

.knowledge-quick:hover {
  color: var(--color-primary);
}

.sidebar-footer {
  padding-top: 16px;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.8) 0%, rgba(94, 231, 255, 0.6) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 16px 30px rgba(10, 132, 255, 0.28);
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
  color: rgba(66, 80, 103, 0.7);
}

@media (prefers-color-scheme: dark) {
  .side-nav::before {
    background:
      linear-gradient(160deg, rgba(148, 191, 255, 0.14) 0%, rgba(148, 191, 255, 0) 60%),
      radial-gradient(60% 60% at 16% 24%, rgba(94, 231, 255, 0.24) 0%, rgba(94, 231, 255, 0) 75%);
  }

  .brand-link {
    background: rgba(14, 26, 48, 0.62);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 20px 40px rgba(1, 7, 20, 0.75);
  }

  .brand-link:hover {
    background: rgba(14, 26, 48, 0.74);
    box-shadow: 0 28px 52px rgba(4, 12, 30, 0.85);
  }

  .brand-subtitle {
    color: rgba(226, 232, 255, 0.6);
  }

  .nav-link {
    background: rgba(14, 26, 48, 0.58);
    border-color: rgba(94, 129, 190, 0.28);
    color: rgba(226, 232, 255, 0.72);
    box-shadow: 0 18px 36px rgba(2, 9, 24, 0.72);
  }

  .nav-link:hover:not(:disabled) {
    background: rgba(14, 26, 48, 0.72);
    color: #f4f8ff;
    box-shadow: 0 24px 44px rgba(4, 12, 30, 0.8);
  }

  .nav-link.active {
    background: rgba(90, 200, 255, 0.26);
    border-color: rgba(94, 231, 255, 0.42);
    box-shadow: 0 26px 52px rgba(90, 200, 255, 0.32);
    color: #5ac8fa;
  }

  .section-title {
    color: rgba(226, 232, 255, 0.65);
  }

  .icon-button {
    background: rgba(14, 26, 48, 0.55);
    border-color: rgba(94, 129, 190, 0.32);
    color: rgba(226, 232, 255, 0.6);
  }

  .icon-button:hover:not(:disabled) {
    background: rgba(14, 26, 48, 0.72);
    color: #5ac8fa;
    box-shadow: 0 20px 40px rgba(4, 12, 30, 0.78);
  }

  .history-item {
    background: rgba(14, 26, 48, 0.62);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 20px 44px rgba(1, 8, 24, 0.78);
  }

  .history-item:hover {
    box-shadow: 0 26px 52px rgba(1, 10, 28, 0.85);
  }

  .history-item.active {
    background: rgba(90, 200, 255, 0.26);
    border-color: rgba(94, 231, 255, 0.4);
    color: #f4f8ff;
  }

  .history-item.draft {
    background: rgba(90, 200, 255, 0.18);
    border-color: rgba(94, 231, 255, 0.32);
  }

  .history-title {
    color: #f4f8ff;
  }

  .history-meta {
    color: rgba(226, 232, 255, 0.55);
  }

  .delete-button {
    background: rgba(14, 26, 48, 0.55);
    border-color: rgba(94, 129, 190, 0.3);
    color: rgba(226, 232, 255, 0.6);
  }

  .delete-button:hover {
    background: rgba(255, 69, 58, 0.18);
    color: #ffd1cd;
  }

  .history-empty {
    background: rgba(14, 26, 48, 0.58);
    color: rgba(226, 232, 255, 0.7);
    box-shadow: none;
  }

  .knowledge-desc {
    color: rgba(226, 232, 255, 0.65);
  }

  .knowledge-button {
    background: rgba(14, 26, 48, 0.6);
    border-color: rgba(94, 129, 190, 0.3);
    color: rgba(226, 232, 255, 0.78);
    box-shadow: 0 20px 44px rgba(1, 8, 24, 0.75);
  }

  .knowledge-button:hover {
    background: rgba(14, 26, 48, 0.74);
    color: #5ac8fa;
    border-color: rgba(94, 231, 255, 0.42);
  }

  .knowledge-quick {
    color: rgba(226, 232, 255, 0.7);
  }

  .knowledge-quick:hover {
    color: #5ac8fa;
  }

  .sidebar-footer {
    border-top-color: rgba(94, 129, 190, 0.32);
    background: rgba(14, 26, 48, 0.5);
    box-shadow: inset 0 1px 0 rgba(94, 129, 190, 0.2);
  }

  .user-tag {
    color: rgba(226, 232, 255, 0.6);
  }

  .avatar {
    background: linear-gradient(135deg, rgba(94, 231, 255, 0.28) 0%, rgba(94, 92, 230, 0.32) 100%);
    box-shadow: 0 18px 38px rgba(1, 8, 24, 0.75);
  }
}

@media (max-width: 960px) {
  .side-nav {
    display: none;
  }
}
</style>
