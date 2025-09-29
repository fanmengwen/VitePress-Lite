<template>
  <div class="home-viewport">
    <SideNav />
    <main class="home-main">
      <!-- Fixed Question Title -->
      <div
        v-if="showChat && chatRef?.currentQuestion"
        class="fixed-question-title glass-surface"
      >
        <h1>{{ chatRef.currentQuestion }}</h1>
      </div>
      
      <div class="home-center">
        <h1 v-show="!showChat" class="slogan">用<span class="em">提问</span>查询知识</h1>

        <div v-show="!showChat" class="ask-card">
          <div class="ask-input-wrap">
            <input
              v-model="askText"
              type="text"
              class="ask-input"
              placeholder="输入你的问题"
              @keyup.enter="onAsk"
            />
            <button
              class="ask-send"
              @click="onAsk"
              :disabled="!askText.trim() || isPreparingConversation"
            >
              {{ isPreparingConversation ? '准备中...' : '提问' }}
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
          <ChatbotWindow
            ref="chatRef"
            :inline="true"
            :hideCompact="true"
            :inlineHeight="600"
            :autoExpand="true"
            :conversation-id="activeConversationId || null"
          />
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
  background: transparent;
  position: relative;
  isolation: isolate;
}

.home-viewport::before {
  content: "";
  position: fixed;
  inset: -12% -16% -18% -12%;
  pointer-events: none;
  background:
    radial-gradient(85% 70% at 6% 14%, rgba(120, 187, 255, 0.28) 0%, rgba(120, 187, 255, 0) 58%),
    radial-gradient(90% 70% at 70% 4%, rgba(154, 221, 255, 0.24) 0%, rgba(154, 221, 255, 0) 62%),
    radial-gradient(120% 90% at 82% 78%, rgba(111, 180, 255, 0.18) 0%, rgba(111, 180, 255, 0) 70%);
  filter: saturate(120%);
  z-index: -1;
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
  width: 860px;
  justify-content: center;
  max-width: 100%;
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
.slogan .em { color: var(--color-primary); }

.ask-card {
  width: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  padding: 12px;
}
.ask-input-wrap { display: flex; gap: 12px; align-items: center; }
.ask-input {
  flex: 1; height: 56px; border-radius: 12px; border: 1px solid var(--color-border-light);
  padding: 0 16px; font-size: 16px;
}
.ask-send { height: 56px; padding: 0 24px; border-radius: 12px; border: none; background: var(--color-primary); color: #fff; cursor: pointer;&:disabled { background: var(--color-border-dark); cursor: not-allowed; } }
.ask-row { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; color: var(--color-text-tertiary); font-size: 12px; }
.ask-left { display: flex; align-items: center; gap: 6px; }
.ask-right { display: flex; align-items: center; gap: 8px; }
.dot { width: 4px; height: 4px; border-radius: 50%; background: var(--color-border-default); display: inline-block; }
.ask-error { margin-top: 8px; color: #d04747; font-size: 12px; }

.suggestions { margin-top: 12px; display: flex; gap: 10px; flex-wrap: nowrap; justify-content: center; padding: 8px 12px; background: linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0)); border-radius: 12px; }
.chip { white-space: nowrap;border: 1px solid rgba(0,0,0,0.06); background: #fff; color: var(--color-text-secondary); border-radius: 999px; padding: 16px 14px; font-size: 13px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.chip:hover { background: var(--color-primary-50); color: var(--color-primary); border-color: var(--color-primary-100); }

.chat-area { 
  width: 100%; 
  padding: 32px;
  background: linear-gradient(186deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.14) 100%);
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow: 0 26px 58px -30px rgba(12, 26, 57, 0.3);
  border-radius: 28px;
  backdrop-filter: blur(calc(var(--glass-blur) - 6px)) saturate(160%);
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) - 6px)) saturate(160%);
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (prefers-color-scheme: dark) {
  .home-viewport::before {
    background:
      radial-gradient(90% 70% at 6% 18%, rgba(94, 231, 255, 0.28) 0%, rgba(94, 231, 255, 0) 62%),
      radial-gradient(85% 70% at 72% 6%, rgba(94, 92, 230, 0.2) 0%, rgba(94, 92, 230, 0) 60%),
      radial-gradient(120% 90% at 82% 82%, rgba(37, 99, 235, 0.18) 0%, rgba(37, 99, 235, 0) 72%);
    filter: saturate(110%);
  }

  .chat-area {
    background: linear-gradient(186deg, rgba(14, 26, 48, 0.68) 0%, rgba(8, 17, 34, 0.42) 100%);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 32px 62px -28px rgba(1, 8, 24, 0.68);
  }

}

/* Fixed Question Title */
.fixed-question-title {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: clamp(14px, 2.6vw, 22px) clamp(18px, 4vw, 32px);
  background:
    linear-gradient(156deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.36) 52%),
    radial-gradient(100% 180% at 96% 4%, rgba(120, 187, 255, 0.32) 0%, rgba(120, 187, 255, 0) 38%);
  border: 1px solid var(--glass-panel-border);
  box-shadow:
    0 28px 62px -30px rgba(12, 26, 57, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);
  backdrop-filter: blur(calc(var(--glass-blur) - 8px)) saturate(182%);
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) - 8px)) saturate(182%);
  min-height: 68px;
  width: 100%;
  align-self: stretch;
  box-sizing: border-box;
  z-index: var(--z-sticky, 1020);
  overflow: hidden;
  isolation: isolate;
}

.fixed-question-title::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.46) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(255, 255, 255, 0) 72%),
    radial-gradient(90% 140% at 0% 0%, rgba(120, 187, 255, 0.24) 0%, rgba(120, 187, 255, 0) 68%);
  pointer-events: none;
  mix-blend-mode: screen;
}

.fixed-question-title h1 {
  margin: 0;
  font-size: clamp(18px, 2.8vw, 16px);
  color: var(--color-text-primary);
  font-weight: 700;
  text-align: left;
  line-height: 1.25;
  letter-spacing: -0.015em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: linear-gradient(120deg, rgba(18, 36, 64, 0.98) 0%, rgba(28, 68, 120, 0.92) 26%, rgba(10, 132, 255, 0.95) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow:
    0 18px 34px rgba(10, 132, 255, 0.28),
    0 2px 3px rgba(255, 255, 255, 0.72);
}

@media (prefers-color-scheme: dark) {
  .fixed-question-title {
    background:
      linear-gradient(158deg, rgba(14, 26, 48, 0.86) 0%, rgba(14, 26, 48, 0.62) 78%),
      radial-gradient(140% 190% at 92% 4%, rgba(94, 231, 255, 0.28) 0%, rgba(94, 231, 255, 0) 64%);
    border-color: rgba(148, 191, 255, 0.28);
    box-shadow:
      0 34px 70px -32px rgba(0, 12, 32, 0.82),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  .fixed-question-title::before {
    background:
      linear-gradient(128deg, rgba(94, 231, 255, 0.3) 0%, rgba(94, 231, 255, 0.12) 46%, rgba(94, 231, 255, 0) 75%),
      radial-gradient(90% 140% at 0% 0%, rgba(68, 175, 255, 0.32) 0%, rgba(68, 175, 255, 0) 72%);
  }

  .fixed-question-title h1 {
    color: rgba(228, 238, 255, 0.92);
    background: linear-gradient(120deg, rgba(228, 238, 255, 0.97) 0%, rgba(168, 212, 255, 0.94) 46%, rgba(120, 220, 255, 0.98) 100%);
    text-shadow:
      0 20px 36px rgba(10, 132, 255, 0.35),
      0 1px 3px rgba(1, 8, 24, 0.65);
  }
}

/* Adjust main content when fixed title is shown */
.home-main:has(.fixed-question-title) .home-center {
  margin-top: 124px;
}

@media (max-width: 840px) {
  .home-viewport { flex-direction: column; }
  .home-main { height: auto; }
  
  .fixed-question-title {
    padding: 12px 18px;
    gap: 10px;
    min-height: 60px;
  }

  .fixed-question-title h1 {
    font-size: clamp(16px, 5vw, 20px);
    white-space: normal;
  }
  
  .home-main:has(.fixed-question-title) .home-center { margin-top: 0; padding-top: 0; }
}

</style>
