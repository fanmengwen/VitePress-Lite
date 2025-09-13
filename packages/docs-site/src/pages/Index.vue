<template>
  <div class="home-viewport">
    <SideNav />
    <main class="home-main">
      <div class="home-center">
        <h1 class="slogan"><span class="em">用提问</span>发现世界</h1>

        <div class="ask-card">
          <div class="ask-input-wrap">
            <input
              v-model="askText"
              type="text"
              class="ask-input"
              placeholder="输入你的问题，或使用 @ 快捷引用文档"
              @keyup.enter="onAsk"
            />
            <button class="ask-send" @click="onAsk">提问</button>
          </div>
          <div class="ask-row">
            <div class="ask-left">
              <span class="provider">深度思考 R1</span>
              <span class="dot"></span>
              <span>知</span>
              <span class="dot"></span>
              <span>图</span>
            </div>
            <div class="ask-right">
              <span class="icon">@</span>
              <span class="icon">📎</span>
              <span class="icon">⬆️</span>
            </div>
          </div>
        </div>

        <div class="suggestions">
          <button class="chip" v-for="q in quickQuestions" :key="q" @click="onAskQuick(q)">{{ q }}</button>
        </div>

        <div class="chat-area" v-show="showChat">
          <ChatbotWindow
            ref="chatRef"
            :inline="true"
            :hideCompact="true"
            :inlineHeight="420"
            :autoExpand="true"
          />
        </div>
      </div>

      <footer class="home-footer">
        <span>用户协议</span>
        <span class="dot"></span>
        <span>隐私政策</span>
        <span class="dot"></span>
        <span>备案号</span>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ChatbotWindow from "../components/ChatbotWindow.vue";
import SideNav from "../components/common/SideNav.vue";

const askText = ref('');
const showChat = ref(false);
const chatRef = ref<InstanceType<typeof ChatbotWindow> | null>(null);
const quickQuestions = [
  '现代医学有哪些自相矛盾的地方？',
  '噪音真要被认同吗？',
  '如何看待读书无用论？'
];

const onAsk = () => {
  const q = askText.value.trim();
  if (!q) return;
  showChat.value = true;
  chatRef.value?.ask(q);
  askText.value = '';
};

const onAskQuick = (q: string) => {
  askText.value = q;
  onAsk();
};
</script>

<style scoped>
.home-viewport {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-primary);
}

.home-main {
  flex: 1;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.home-center {
  width: 100%;
  max-width: 920px;
  margin-top: 8vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px;
  box-sizing: border-box;
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
.ask-send { height: 56px; padding: 0 24px; border-radius: 12px; border: none; background: var(--color-primary); color: #fff; cursor: pointer; }
.ask-row { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; color: var(--color-text-tertiary); font-size: 12px; }
.ask-left { display: flex; align-items: center; gap: 6px; }
.ask-right { display: flex; align-items: center; gap: 8px; }
.dot { width: 4px; height: 4px; border-radius: 50%; background: var(--color-border-default); display: inline-block; }

.suggestions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.chip { border: 1px solid var(--color-border-light); background: var(--color-bg-secondary); border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer; }

.chat-area { margin-top: 16px; width: 100%; }

.home-footer { height: 48px; display: flex; align-items: center; gap: 8px; color: var(--color-text-tertiary); font-size: 12px; }

@media (max-width: 840px) {
  .home-viewport { flex-direction: column; }
  .home-main { height: auto; }
}
</style>
