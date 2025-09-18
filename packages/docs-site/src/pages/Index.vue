<template>
  <div class="home-viewport">
    <SideNav />
    <main class="home-main">
      <!-- Fixed Question Title -->
      <div v-if="showChat && chatRef?.currentQuestion" class="fixed-question-title">
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
  background: var(--color-bg-primary);
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
  padding: 28px;
  background: transparent;
  border: none;
  box-shadow: none;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Fixed Question Title */
.fixed-question-title {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  background: var(--color-bg-primary);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border-light);
  padding: 16px 24px;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  align-self: stretch;
  box-sizing: border-box;
}

.fixed-question-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: left;
  line-height: 1.3;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Adjust main content when fixed title is shown */
.home-main:has(.fixed-question-title) .home-center {
  margin-top: 0;
}

@media (max-width: 840px) {
  .home-viewport { flex-direction: column; }
  .home-main { height: auto; }
  
  .fixed-question-title { padding: 12px 16px; }
  
  .fixed-question-title h1 {
    font-size: 18px;
  }
  
  .home-main:has(.fixed-question-title) .home-center { margin-top: 0; padding-top: 0; }
}

</style>
