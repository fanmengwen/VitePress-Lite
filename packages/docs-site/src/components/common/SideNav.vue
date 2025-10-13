<template>
  <aside class="side-nav">
    <div class="sidebar-body">
      <div class="brand-block">
        <router-link to="/" class="brand-link">
          <span class="brand-icon">💬</span>
          <div class="brand-texts">
            <span class="brand-title">智识自答</span>
            <span class="brand-subtitle">文档驱动的 AI 助手</span>
          </div>
        </router-link>
      </div>

      <nav class="nav-links">
        <button class="nav-link btn btn-ghost" :class="{ active: isCreating }" :disabled="isCreating"
          @click="handleNewConversation">
          <span class="icon">💬</span>
          <span>{{ isCreating ? '创建中...' : '新建对话' }}</span>
        </button>
        <router-link to="/kb" class="nav-link btn btn-ghost" :class="{ active: route.path.startsWith('/kb') }">
          <span class="icon">📚</span>
          <span>知识库</span>
        </router-link>
        <a :href="githubUrl" class="nav-link btn btn-ghost" target="_blank" rel="noopener noreferrer">
          <span class="icon">🌐</span>
          <span>GitHub 仓库</span>
        </a>
      </nav>


      <section class="history-section">
        <header class="section-header">
          <span class="section-title">历史对话</span>
          <div class="section-actions">
            <button class="icon-btn" :disabled="loading && !hasConversations" @click="handleRefresh" title="刷新对话列表">
              <img src="../../../public/refresh.svg" alt="刷新" width="16" height="16" />
            </button>
          </div>
        </header>

        <div v-if="loading && !hasConversations" class="history-loading">
          <div class="skeleton" v-for="n in 3" :key="n"></div>
        </div>

        <ul v-else-if="hasConversations || isDrafting" class="history-list">
          <li v-if="isDrafting" class="history-item tile draft active">
            <div class="history-button" @click="handleSelectDraft">
              <div class="history-title">新的对话</div>
              <div class="history-meta">等待你的问题…</div>
            </div>
          </li>
          <li v-for="item in conversations" :key="item.id"
            :class="['history-item', 'tile', { active: route.path === '/' && item.id === activeConversationId, 'tile-active': route.path === '/' && item.id === activeConversationId }]">
            <div class="history-button" @click="handleSelectConversation(item.id)">
              <div class="history-title" :title="item.title">
                {{ formatConversationTitle(item.title) }}
              </div>
              <div class="history-meta">{{ formatUpdatedAt(item.updated_at) }}</div>
            </div>
            <button class="icon-btn delete-button" title="删除对话" @click.stop="handleDeleteConversation(item.id)">
              ✕
            </button>
          </li>
        </ul>

        <div v-else class="history-empty">
          <p>暂无历史记录。点击上方按钮开始新对话。</p>
        </div>

        <p v-if="storeError" class="store-error">{{ storeError }}</p>
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
    <ConfirmModal v-model="showDeleteModal" title="删除对话" message="此操作无法撤销，确定要删除该对话吗？" confirm-text="删除" cancel-text="取消"
      @confirm="confirmDelete" />
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
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100vh;
  color: var(--color-text-primary);
  position: relative;
  overflow: hidden;
}

.side-nav::before,
.side-nav::after {
  content: none;
}

.sidebar-body {
  flex: 1;
  padding: 24px 22px 18px;
  backdrop-filter: inherit;
  -webkit-backdrop-filter: inherit;
  border: 1px solid var(--border-color);
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
  transition: transform var(--transition-base);
}

.brand-link::after {
  content: none;
}

.brand-link:hover {
  transform: translateY(-2px);
}

.brand-link:hover::after {
  opacity: 0.6;
}

.brand-icon {
  font-size: 30px;
  text-shadow:
    0 18px 32px rgba(10, 132, 255, 0.32),
    0 0 12px rgba(255, 255, 255, 0.4);
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
  color: rgba(24, 36, 56, 0.92);
}

.brand-subtitle {
  font-size: 12px;
  color: rgba(45, 61, 91, 0.6);
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
  padding: 12px 40px;
  border-radius: 16px;
  text-decoration: none;
  width: 100%;
  text-align: left;
  justify-content: flex-start;
}

.nav-link:disabled {
  opacity: 0.55;
  cursor: progress;
  box-shadow: none;
}

.nav-link:hover:not(:disabled) {
  transform: translateY(-1px);
}

.nav-link.active {
  color: var(--color-primary);
}

.icon {
  width: 18px;
  text-align: center;
  font-size: 16px;
  color: rgba(18, 36, 64, 0.6);
  text-shadow: 0 6px 16px rgba(10, 132, 255, 0.18);
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
  color: rgba(34, 54, 84, 0.75);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-button {
  display: inline-flex;
}

.icon-button:hover:not(:disabled) {
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
  background: black;
  background-size: 200% 100%;
  margin-bottom: 12px;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 200% 50%;
  }
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
  border-radius: 18px;
  padding: 8px;
}

.history-item:hover {
  transform: translateY(-1px);
}

.history-item.active {
  border-color: rgba(94, 200, 255, 0.52);
}

.history-item.draft {
  border-style: dashed;
  background:
    linear-gradient(155deg, rgba(132, 212, 255, 0.32) 0%, rgba(132, 212, 255, 0.12) 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
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
  color: rgba(22, 40, 68, 0.9);
}

.history-meta {
  font-size: 12px;
  color: rgba(62, 84, 120, 0.68);
}

.delete-button {
  width: 32px;
  height: 32px;
}

.delete-button:hover {
  transform: translateY(-1px);
}

.history-empty {
  padding: 20px;
  border-radius: 18px;
  font-size: 13px;
  color: rgba(36, 54, 84, 0.78);
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
  color: rgba(40, 60, 90, 0.7);
  margin-bottom: 14px;
}

.knowledge-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.knowledge-button {
  height: 46px;
  font-size: 14px;
  font-weight: 500;
}

.knowledge-button:hover {
  transform: translateY(-1px);
}

.knowledge-quick {
  font-size: 13px;
  color: rgba(40, 60, 90, 0.7);
  transition: color var(--transition-base), text-shadow var(--transition-base);
}

.knowledge-quick:hover {
  color: var(--color-primary);
  text-shadow: 0 12px 24px rgba(10, 132, 255, 0.2);
}

.sidebar-footer {
  padding-top: 16px;
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.32);
  padding: 18px 22px 20px;
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
  background:
    linear-gradient(140deg, rgba(90, 200, 255, 0.85) 0%, rgba(255, 255, 255, 0.8) 70%),
    radial-gradient(120% 140% at 30% 10%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow:
    0 18px 32px -18px rgba(10, 132, 255, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(24, 38, 60, 0.92);
}

.user-tag {
  font-size: 12px;
  color: rgba(60, 80, 112, 0.6);
}

@media (prefers-color-scheme: dark) {
  .side-nav {
    color: rgba(232, 240, 255, 0.88);
    background:
      radial-gradient(160% 130% at 0% 0%, rgba(41, 102, 179, 0.4) 0%, rgba(41, 102, 179, 0) 52%),
      radial-gradient(120% 160% at 100% -10%, rgba(166, 98, 255, 0.28) 0%, rgba(166, 98, 255, 0) 58%),
      linear-gradient(200deg, rgba(8, 18, 38, 0.92) 0%, rgba(8, 18, 38, 0.8) 100%);
    border: 1px solid rgba(118, 190, 255, 0.26);
    box-shadow:
      0 42px 96px -36px rgba(0, 5, 20, 0.85),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .side-nav::before {
    background:
      linear-gradient(150deg, rgba(138, 199, 255, 0.2) 0%, rgba(138, 199, 255, 0) 55%),
      radial-gradient(70% 65% at 18% 22%, rgba(77, 225, 255, 0.28) 0%, rgba(77, 225, 255, 0) 70%);
    opacity: 0.7;
  }

  .side-nav::after {
    background:
      linear-gradient(220deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 55%),
      radial-gradient(60% 75% at 85% 10%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 68%);
    opacity: 0.5;
  }

  .brand-link {
    border-color: rgba(118, 190, 255, 0.28);
    background:
      linear-gradient(145deg, rgba(20, 42, 74, 0.82) 0%, rgba(20, 42, 74, 0.56) 100%),
      radial-gradient(150% 160% at -15% 10%, rgba(68, 175, 255, 0.32) 0%, rgba(68, 175, 255, 0) 60%);
    box-shadow:
      0 30px 64px -28px rgba(0, 8, 28, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .brand-link:hover {
    background:
      linear-gradient(145deg, rgba(25, 48, 84, 0.92) 0%, rgba(25, 48, 84, 0.62) 100%),
      radial-gradient(150% 160% at -15% 10%, rgba(68, 175, 255, 0.42) 0%, rgba(68, 175, 255, 0) 60%);
    border-color: rgba(162, 222, 255, 0.42);
    box-shadow:
      0 40px 78px -30px rgba(0, 8, 28, 0.95),
      inset 0 1px 0 rgba(255, 255, 255, 0.16);
  }

  .brand-title {
    color: rgba(240, 246, 255, 0.95);
  }

  .brand-subtitle {
    color: rgba(210, 225, 255, 0.65);
  }

  .icon {
    color: rgba(210, 225, 255, 0.65);
    text-shadow: 0 10px 24px rgba(90, 200, 255, 0.35);
  }

  .nav-link {
    color: rgba(223, 236, 255, 0.78);
    border-color: rgba(118, 190, 255, 0.28);
    background:
      linear-gradient(160deg, rgba(21, 42, 75, 0.8) 0%, rgba(21, 42, 75, 0.52) 100%),
      radial-gradient(140% 160% at 0% 0%, rgba(68, 175, 255, 0.28) 0%, rgba(68, 175, 255, 0) 68%);
    box-shadow:
      0 28px 54px -30px rgba(0, 10, 32, 0.85),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .nav-link:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.92);
    border-color: rgba(162, 222, 255, 0.38);
    background:
      linear-gradient(160deg, rgba(28, 54, 90, 0.92) 0%, rgba(28, 54, 90, 0.6) 100%),
      radial-gradient(140% 160% at 0% 0%, rgba(68, 175, 255, 0.38) 0%, rgba(68, 175, 255, 0) 68%);
    box-shadow:
      0 36px 70px -34px rgba(0, 10, 32, 0.95),
      inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  .nav-link.active {
    color: #5ac8fa;
    border-color: rgba(120, 228, 255, 0.48);
    background:
      linear-gradient(170deg, rgba(36, 92, 140, 0.85) 0%, rgba(36, 92, 140, 0.55) 100%),
      radial-gradient(150% 170% at 0% 0%, rgba(90, 200, 255, 0.38) 0%, rgba(90, 200, 255, 0) 65%);
    box-shadow:
      0 42px 86px -36px rgba(12, 70, 120, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.16);
  }

  .section-title {
    color: rgba(210, 225, 255, 0.65);
  }

  .icon-button {
    color: rgba(210, 225, 255, 0.68);
    border-color: rgba(118, 190, 255, 0.26);
    background:
      linear-gradient(150deg, rgba(21, 42, 75, 0.82) 0%, rgba(21, 42, 75, 0.52) 100%),
      radial-gradient(120% 130% at 0% 0%, rgba(68, 175, 255, 0.28) 0%, rgba(68, 175, 255, 0) 70%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .icon-button:hover:not(:disabled) {
    color: #5ac8fa;
    border-color: rgba(162, 222, 255, 0.42);
    background:
      linear-gradient(150deg, rgba(28, 54, 90, 0.92) 0%, rgba(28, 54, 90, 0.62) 100%),
      radial-gradient(120% 130% at 0% 0%, rgba(68, 175, 255, 0.42) 0%, rgba(68, 175, 255, 0) 70%);
    box-shadow: 0 28px 56px -30px rgba(0, 10, 32, 0.9);
  }

  .history-item {
    border-color: rgba(118, 190, 255, 0.28);
    background:
      linear-gradient(150deg, rgba(21, 44, 78, 0.85) 0%, rgba(21, 44, 78, 0.55) 100%),
      radial-gradient(140% 160% at 0% 0%, rgba(68, 175, 255, 0.32) 0%, rgba(68, 175, 255, 0) 70%);
    box-shadow:
      0 34px 72px -34px rgba(0, 8, 28, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .history-item:hover {
    box-shadow:
      0 42px 86px -36px rgba(0, 8, 28, 0.95),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  .history-item.active {
    border-color: rgba(120, 228, 255, 0.42);
    background:
      linear-gradient(165deg, rgba(32, 86, 133, 0.88) 0%, rgba(32, 86, 133, 0.58) 100%),
      radial-gradient(150% 170% at 0% 0%, rgba(90, 200, 255, 0.4) 0%, rgba(90, 200, 255, 0) 68%);
    box-shadow:
      0 46px 92px -40px rgba(12, 70, 120, 0.62),
      inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  .history-item.draft {
    background:
      linear-gradient(160deg, rgba(32, 86, 133, 0.62) 0%, rgba(32, 86, 133, 0.38) 100%);
    box-shadow: inset 0 0 0 1px rgba(120, 228, 255, 0.32);
  }

  .history-title {
    color: rgba(240, 246, 255, 0.92);
  }

  .history-meta {
    color: rgba(198, 214, 255, 0.6);
  }

  .delete-button {
    color: rgba(220, 232, 255, 0.72);
    border-color: rgba(118, 190, 255, 0.26);
    background:
      linear-gradient(150deg, rgba(21, 42, 75, 0.82) 0%, rgba(21, 42, 75, 0.5) 100%),
      radial-gradient(120% 140% at 0% 0%, rgba(68, 175, 255, 0.28) 0%, rgba(68, 175, 255, 0) 68%);
  }

  .delete-button:hover {
    background:
      linear-gradient(150deg, rgba(255, 69, 58, 0.28) 0%, rgba(255, 69, 58, 0.16) 100%),
      radial-gradient(120% 140% at 0% 0%, rgba(90, 200, 255, 0.22) 0%, rgba(90, 200, 255, 0) 68%);
    color: rgba(255, 205, 198, 0.9);
    border-color: rgba(255, 118, 109, 0.38);
  }

  .history-empty {
    color: rgba(214, 226, 255, 0.68);
    border-color: rgba(118, 190, 255, 0.24);
    background:
      linear-gradient(150deg, rgba(21, 42, 75, 0.82) 0%, rgba(21, 42, 75, 0.52) 100%),
      radial-gradient(140% 150% at 12% 0%, rgba(68, 175, 255, 0.32) 0%, rgba(68, 175, 255, 0) 68%);
    box-shadow: none;
  }

  .knowledge-desc {
    color: rgba(214, 226, 255, 0.65);
  }

  .knowledge-button {
    color: rgba(220, 232, 255, 0.82);
    border-color: rgba(118, 190, 255, 0.28);
    background:
      linear-gradient(155deg, rgba(21, 42, 75, 0.82) 0%, rgba(21, 42, 75, 0.5) 100%),
      radial-gradient(130% 150% at 0% 0%, rgba(68, 175, 255, 0.32) 0%, rgba(68, 175, 255, 0) 70%);
    box-shadow:
      0 32px 64px -32px rgba(0, 10, 32, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .knowledge-button:hover {
    border-color: rgba(162, 222, 255, 0.38);
    background:
      linear-gradient(155deg, rgba(28, 54, 90, 0.92) 0%, rgba(28, 54, 90, 0.58) 100%),
      radial-gradient(130% 150% at 0% 0%, rgba(68, 175, 255, 0.45) 0%, rgba(68, 175, 255, 0) 70%);
    color: #5ac8fa;
  }

  .knowledge-quick {
    color: rgba(210, 225, 255, 0.68);
  }

  .knowledge-quick:hover {
    color: #5ac8fa;
  }

  .sidebar-footer {
    border-top-color: rgba(118, 190, 255, 0.3);
    background:
      linear-gradient(155deg, rgba(21, 42, 75, 0.8) 0%, rgba(21, 42, 75, 0.52) 100%),
      radial-gradient(120% 150% at 0% 0%, rgba(68, 175, 255, 0.26) 0%, rgba(68, 175, 255, 0) 68%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .avatar {
    background:
      linear-gradient(145deg, rgba(90, 200, 255, 0.85) 0%, rgba(60, 110, 200, 0.82) 100%),
      radial-gradient(130% 140% at 30% 10%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 60%);
    box-shadow:
      0 24px 48px -22px rgba(0, 12, 32, 0.8),
      inset 0 1px 0 rgba(255, 255, 255, 0.18);
  }

  .user-name {
    color: rgba(236, 244, 255, 0.9);
  }

  .user-tag {
    color: rgba(192, 210, 255, 0.6);
  }
}

@media (max-width: 960px) {
  .side-nav {
    display: none;
  }
}
</style>
