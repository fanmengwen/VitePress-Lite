<template>
  <div class="home-viewport">
    <SideNav />
    <main class="home-main">
      <!-- Fixed Question Title -->
      <div v-if="showChat && chatRef?.currentQuestion" class="fixed-question-title glass-surface">
        <h1>{{ chatRef.currentQuestion }}</h1>
      </div>

      <div class="home-center">
        <h1 v-show="!showChat" class="slogan">用<span class="em">提问</span>查询知识</h1>

        <div v-show="!showChat" class="ask-card">
          <div class="ask-input-wrap">
            <input v-model="askText" type="text" class="ask-input" placeholder="输入你的问题" @keyup.enter="onAsk" />
            <button class="ask-send" @click="onAsk" :disabled="!askText.trim() || isPreparingConversation">
              <svg v-if="!isPreparingConversation" class="send-icon" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span v-else>准备中...</span>
            </button>
          </div>
          <div class="ask-row">
          </div>
          <p v-if="askError" class="ask-error">{{ askError }}</p>
        </div>

        <div v-show="!showChat" class="suggestions">
          <button class="chip" v-for="q in quickQuestions" :key="q" @click="onAskQuick(q)">{{ q }}</button>
        </div>

        <div class="chat-area" v-if="showChat">
          <ChatbotWindow ref="chatRef" :inline="true" :hideCompact="true" :inlineHeight="600" :autoExpand="true"
            :conversation-id="activeConversationId || null" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import ChatbotWindow from '../components/ChatbotWindow.vue';
import SideNav from '../components/common/SideNav.vue';
import { useConversations } from '@/composables/useConversations';

const askText = ref('');
const chatRef = ref<InstanceType<typeof ChatbotWindow> | null>(null);
const quickQuestions = [
  '如何配置Vite的代理？',
  'Vite的HMR是如何工作的？',
  '如何优化Vite构建性能？',
  'Vite的插件有哪些？',
];

const { activeConversationId, setActive, ensureLoaded, isDrafting } = useConversations();

const isPreparingConversation = ref(false);
const askError = ref('');

onMounted(() => {
  ensureLoaded();
});

const showChat = computed(() => Boolean(activeConversationId.value) || isDrafting.value);

const ensureChatReady = async () => {
  isPreparingConversation.value = true;
  try {
    setActive(null);
    await nextTick();
  } finally {
    isPreparingConversation.value = false;
  }
};

const onAsk = async () => {
  const q = askText.value.trim();
  if (!q || isPreparingConversation.value) return;
  askError.value = '';
  try {
    await ensureChatReady();
    await chatRef.value?.ask(q);
    askText.value = '';
  } catch (error) {
    askError.value = error instanceof Error ? error.message : '发送失败，请重试';
  }
};

const onAskQuick = async (q: string) => {
  askText.value = q;
  await onAsk();
};
</script>

<style scoped>
.home-viewport {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
  position: relative;
  isolation: isolate;
}


.home-main {
  flex: 1;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-y: auto;
  position: relative;
}

.home-center {
  overflow-y: auto;
  width: 100%;
  justify-content: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
}

/* When chat is shown, remove max-width and use full width */
.home-center:has(.chat-area) {
  max-width: none;
  /* width: 100%; */
  align-items: stretch;
  padding: 0;
}

.slogan {
  margin: 0 0 20px;
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 900;
  letter-spacing: 1px;
  color: var(--color-text-primary);
}

.slogan .em {
  color: var(--color-primary);
}

.ask-card {
  width: 100%;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 8px rgba(0, 0, 0, 0.06),
    0 8px 16px rgba(0, 0, 0, 0.08);
  padding: 12px;
}

.ask-input-wrap {
  display: flex;
  gap: 12px;
  align-items: center;
}

.ask-input {
  flex: 1;
  height: 56px;
  border-radius: 12px;
  border: 1.5px solid var(--border-color);
  padding: 0 16px;
  font-size: 16px;
  background: #ffffff;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.ask-input:focus {
  outline: none;
  border: 1.5px solid transparent;
  background: linear-gradient(white, white) padding-box,
    linear-gradient(135deg, #0066ff, #3385ff) border-box;
  box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.12);
}

.ask-send {
  height: 56px;
  padding: 0 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
  color: var(--color-text-inverse);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s ease, height 0.6s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3);
  }

  &:hover:not(:disabled)::before {
    width: 300px;
    height: 300px;
  }

  &:disabled {
    background: var(--color-bg-subtle);
    color: var(--color-text-tertiary);
    cursor: not-allowed;
    transform: none;
  }
}

.send-icon {
  width: 20px;
  height: 20px;
  transition: transform 200ms ease;
}

.ask-send:hover:not(:disabled) .send-icon {
  transform: translateX(2px);
}

.ask-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.ask-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ask-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-border-default);
  display: inline-block;
}

.ask-error {
  margin-top: 8px;
  color: #d04747;
  font-size: 12px;
}

.suggestions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: nowrap;
  justify-content: center;
  padding: 8px 0;
}

.chip {
  white-space: nowrap;
  border: 1px solid var(--border-color);
  background: var(--color-bg-base);
  color: var(--color-text-secondary);
  border-radius: 999px;
  padding: 12px 16px;
  font-size: 13px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: var(--transition-base);
}

.chip:hover {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card);
}

.chat-area {
  width: 100%;
  padding: 32px;
  border-radius: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (prefers-color-scheme: dark) {
  /* Dark mode styles inherit from design-system.css */
}

/* Fixed Question Title - 优雅融合设计 */
.fixed-question-title {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: clamp(14px, 2.6vw, 22px) clamp(18px, 4vw, 32px);
  background: linear-gradient(180deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.85) 100%);
  backdrop-filter: blur(8px) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);
  border-bottom: 1px solid rgba(229, 231, 235, 0.8);
  min-height: 68px;
  width: 100%;
  align-self: stretch;
  box-sizing: border-box;
  z-index: var(--z-sticky, 1020);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 4px 16px rgba(0, 0, 0, 0.04);
}

.fixed-question-title h1 {
  margin: 0;
  font-size: clamp(18px, 2.8vw, 24px);
  font-weight: 400;
  text-align: left;
  line-height: 1.25;
  letter-spacing: -0.015em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #1f2937;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}



@media (max-width: 840px) {
  .home-viewport {
    flex-direction: column;
  }

  .home-main {
    height: auto;
  }

  .fixed-question-title {
    padding: 12px 18px;
    gap: 10px;
    min-height: 60px;
  }

  .fixed-question-title h1 {
    font-size: clamp(16px, 5vw, 20px);
    white-space: normal;
  }

  .home-main:has(.fixed-question-title) .home-center {
    margin-top: 0;
    padding-top: 0;
  }
}
</style>
