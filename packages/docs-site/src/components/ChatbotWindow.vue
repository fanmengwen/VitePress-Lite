<template>
  <div 
    class="chatbot-window" 
    :class="{ 
      'expanded': isExpanded, 
      'loading': isLoading,
      'error': hasError,
      'inline-mode': inline
    }"
  >
    <!-- Compact State -->
    <div v-if="!isExpanded && !hideCompact" class="chatbot-compact" @click="expandChat">
      <div class="compact-content">
        <div class="ai-icon">🤖</div>
        <div class="compact-text">
          <h3>AI 助手</h3>
          <p>有问题？点击与 AI 对话</p>
        </div>
        <div class="expand-indicator">💬</div>
      </div>
    </div>

    <!-- Expanded State -->
    <div v-else class="chatbot-expanded" :style="inline ? { height: `${inlineHeight}px`, width: '100%' } : {}">
      <!-- Header (hidden in inline/perplexity mode) -->
      <div class="chat-header" v-if="!inline">
        <div class="header-info">
          <span class="ai-avatar">🤖</span>
          <div class="header-text">
            <h3>AI 文档助手</h3>
            <p class="status-text">
              {{ connectionStatus }}
            </p>
          </div>
        </div>
        <button 
          @click="collapseChat" 
          class="collapse-btn"
          aria-label="收起聊天窗口"
        >
          ✕
        </button>
      </div>

        <!-- Messages Container -->
      <div class="messages-container" ref="messagesContainer">
        <!-- Sticky question header (inline mode) -->
        <div 
          v-if="inline && (currentQuestion || lastQuestion)"
          class="sticky-question-header"
        >
        </div>
        <div class="messages-inner">
          <!-- Step badges / progress -->
          <div v-if="progress.stage" class="progress-bar">
            <div class="progress-dot" :class="{ done: progress.stage !== 'retrieve' }">1</div>
            <span :class="{ active: progress.stage === 'retrieve' }">检索</span>
            <div class="progress-line" :class="{ done: progress.stage !== 'retrieve' }"></div>
            <div class="progress-dot" :class="{ done: progress.stage === 'done' }">2</div>
            <span :class="{ active: progress.stage === 'generate' }">生成</span>
          </div>
          <div v-if="historyLoading" class="conversation-status loading">
            <div class="loading-spinner"></div>
            <span>正在加载对话记录...</span>
          </div>

          <div v-else-if="historyError" class="conversation-status error">
            <span>{{ historyError }}</span>
            <button class="retry-btn" @click="reloadCurrentConversation">重试</button>
          </div>

          <!-- Welcome Message -->
          <div v-else-if="messages.length === 0" class="welcome-message">
            <div class="ai-message">
              <div class="message-avatar">🤖</div>
              <div class="message-content">
                <p>👋 你好！我是 AI 文档助手，可以帮你回答关于 Vite 的问题。</p>
                <div class="suggested-questions">
                  <h4>试试这些问题：</h4>
                  <button 
                    v-for="question in suggestedQuestions" 
                    :key="question"
                    @click="askSuggestedQuestion(question)"
                    class="suggested-question-btn"
                  >
                    {{ question }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Chat Messages -->
          <div 
            v-for="(message, index) in messages" 
            :key="index"
            class="message"
            :class="{ 
              'user-message': message.role === 'user', 
              'ai-message': message.role === 'assistant' 
            }"
          >
            <div class="message-avatar">
              {{ message.role === 'user' ? '👤' : '🤖' }}
            </div>
            <div class="message-content">
              <div class="message-text" v-html="formatMessage(message.content)"></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              
              <!-- Sources for AI messages - Perplexity Style -->
              <div v-if="message.sources && message.sources.length > 0" class="message-sources perplexity-sources">
                <h5 class="sources-header">📚 参考资料：</h5>
                <div class="sources-grid">
                  <div 
                    v-for="(source, index) in message.sources" 
                    :key="source.file_path + source.chunk_index"
                    class="source-card"
                    @click="navigateToSource(source)"
                    :title="`点击跳转到：${source.title}`"
                  >
                    <div class="source-number">{{ index + 1 }}</div>
                    <div class="source-content">
                      <div class="source-title">{{ source.title }}</div>
                      <div class="source-score">相似度: {{ Math.round(source.similarity_score * 100) }}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading Message -->
          <div v-if="isLoading" class="message ai-message loading-message">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="loading-text">AI 正在思考中...</div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage && lastQuestion" class="message error-message">
            <div class="message-avatar">⚠️</div>
            <div class="message-content">
              <div class="error-text">{{ errorMessage }}</div>
              <button @click="retryLastQuestion" class="retry-btn" >重试</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <form @submit.prevent="sendMessage" class="input-form">
          <div class="input-group">
            <textarea
              v-model="currentInput"
              ref="inputRef"
              class="message-input"
              placeholder="输入你的问题..."
              rows="1"
              :disabled="isLoading"
              @keydown="handleKeydown"
              @input="autoResizeTextarea"
            ></textarea>
            <button 
              type="submit" 
              class="send-btn"
              :disabled="!currentInput.trim() || isLoading"
              aria-label="发送消息"
            >
              {{ isLoading ? '⏳' : '📤' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { aiApiClient, type ChatMessage, type ChatResponse, type SourceReference, type ConversationDetail, getAIErrorMessage } from '@/api/ai';
import { useConversations } from '@/composables/useConversations';

// Props
interface Props {
  autoExpand?: boolean;
  maxMessages?: number;
  persistHistory?: boolean;
  inline?: boolean; // inline mode renders as block instead of fixed bubble
  inlineHeight?: number; // height for inline chat area
  hideCompact?: boolean; // hide compact bubble trigger
  conversationId?: string | null;
  autoCreateConversation?: boolean;
  autoRename?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoExpand: false,
  maxMessages: 100,
  persistHistory: false,
  inline: false,
  inlineHeight: 460,
  hideCompact: false,
  conversationId: null,
  autoCreateConversation: true,
  autoRename: true,
});

// Router instance
const router = useRouter();
const {
  activeConversationId,
  activeConversation,
  setActive,
  create,
  loadDetail,
  markActivity,
  markRenamed,
} = useConversations();

// Reactive state
const isExpanded = ref(props.autoExpand);
const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref('');
const currentInput = ref('');
const messages = ref<(ChatMessage & { sources?: SourceReference[] })[]>([]);
const showSources = ref(true);
const lastQuestion = ref('');
const currentQuestion = ref('');
const progress = ref<{ stage: 'retrieve' | 'generate' | 'done' | '' }>({ stage: '' });
const currentConversationId = ref<string | null>(props.conversationId ?? null);
const historyLoading = ref(false);
const historyError = ref('');
const hasRenamedCurrentConversation = ref(false);

// Refs for DOM elements
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

// Suggested questions
const suggestedQuestions = [
  "什么是 Vite？",
  "如何配置 Vite 的代理？",
  "Vite 的 HMR 是如何工作的？",
  "如何优化 Vite 构建性能？"
];

// Connection status
const connectionStatus = computed(() => {
  if (hasError.value) return '连接异常';
  if (isLoading.value) return '处理中...';
  return '在线';
});

// Methods
const expandChat = () => {
  isExpanded.value = true;
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const collapseChat = () => {
  isExpanded.value = false;
};

// Navigate to source document
const navigateToSource = (source: SourceReference) => {
  try {
    // Convert file_path to route path
    // Example: "03-configuration/setting.md" -> "/03-configuration/setting"
    let routePath = source.file_path;
    
    // Remove .md extension
    if (routePath.endsWith('.md')) {
      routePath = routePath.slice(0, -3);
    }
    
    // Ensure it starts with /
    if (!routePath.startsWith('/')) {
      routePath = '/' + routePath;
    }
    
    console.log(`Navigating to source: ${source.title} -> ${routePath}`);
    
    // Navigate to the document
    router.push(routePath);
    
    // Collapse chat window after navigation
    collapseChat();
    
  } catch (error) {
    console.error('Failed to navigate to source:', error);
    // Show user-friendly error
    errorMessage.value = '跳转失败，请手动搜索相关文档';
    hasError.value = true;
    setTimeout(() => {
      hasError.value = false;
      errorMessage.value = '';
    }, 3000);
  }
};

const defaultTitleMarkers = ['new conversation', '新的对话', '新建对话', '未命名对话'];

const isDefaultConversationTitle = (title?: string | null) => {
  if (!title) return true;
  const normalized = title.trim().toLowerCase();
  return defaultTitleMarkers.some((marker) => normalized.startsWith(marker));
};

const buildTitleFromQuestion = (question: string) => {
  const trimmed = question.trim();
  if (!trimmed) return '新建对话';
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}...` : trimmed;
};

const resetConversationState = () => {
  messages.value = [];
  historyError.value = '';
  progress.value.stage = '';
  hasRenamedCurrentConversation.value = false;
  currentQuestion.value = '';
  lastQuestion.value = '';
};

const hydrateConversation = (detail: ConversationDetail) => {
  const hydrated = detail.messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date(msg.timestamp).toISOString(),
  }));
  messages.value = hydrated;

  const lastUser = [...hydrated].reverse().find((msg) => msg.role === 'user');
  if (lastUser) {
    currentQuestion.value = lastUser.content;
    lastQuestion.value = lastUser.content;
  }

  hasRenamedCurrentConversation.value = !isDefaultConversationTitle(detail.title);
};

const loadConversation = async (conversationId: string) => {
  resetConversationState();
  historyLoading.value = true;
  historyError.value = '';
  try {
    const detail = await loadDetail(conversationId);
    hydrateConversation(detail);
    currentConversationId.value = detail.id;
    setActive(detail.id);
    await scrollToBottom();
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    historyError.value = getAIErrorMessage(error);
  } finally {
    historyLoading.value = false;
  }
};

const ensureConversation = async (): Promise<string> => {
  if (currentConversationId.value) {
    return currentConversationId.value;
  }
  if (props.conversationId) {
    currentConversationId.value = props.conversationId;
    setActive(props.conversationId);
    return props.conversationId;
  }
  if (!props.autoCreateConversation) {
    throw new Error('No active conversation. 创建对话后再发送消息。');
  }
  const convo = await create();
  currentConversationId.value = convo.id;
  setActive(convo.id);
  resetConversationState();
  return convo.id;
};

const maybeRenameConversation = async (conversationId: string, question: string) => {
  if (!props.autoRename || hasRenamedCurrentConversation.value) return;
  const candidate = buildTitleFromQuestion(question);
  if (!candidate) return;
  const convo = activeConversation.value;
  if (convo && convo.id === conversationId && !isDefaultConversationTitle(convo.title)) {
    hasRenamedCurrentConversation.value = true;
    return;
  }
  try {
    await aiApiClient.renameConversation(conversationId, candidate);
    markRenamed(conversationId, candidate);
    hasRenamedCurrentConversation.value = true;
  } catch (error) {
    console.warn('Failed to rename conversation:', error);
  }
};

const reloadCurrentConversation = async () => {
  if (!currentConversationId.value) return;
  await loadConversation(currentConversationId.value);
};

watch(
  () => props.conversationId,
  (newId) => {
    if (!newId) {
      currentConversationId.value = null;
      resetConversationState();
      return;
    }
    if (newId === currentConversationId.value && !historyError.value) {
      return;
    }
    loadConversation(newId);
  },
  { immediate: true },
);

watch(
  activeConversationId,
  (newId) => {
    if (!props.conversationId && newId) {
      currentConversationId.value = newId;
    }
  },
);

const sendMessage = async () => {
  const question = currentInput.value.trim();
  if (!question || isLoading.value) return;

  lastQuestion.value = question;
  currentQuestion.value = question;
  currentInput.value = '';
  isLoading.value = true;
  hasError.value = false;
  errorMessage.value = '';

  let conversationId: string;
  try {
    conversationId = await ensureConversation();
  } catch (error) {
    isLoading.value = false;
    hasError.value = true;
    errorMessage.value = getAIErrorMessage(error);
    return;
  }
  currentConversationId.value = conversationId;

  // Add user message
  const userMessage: ChatMessage = {
    role: 'user',
    content: question,
    timestamp: new Date().toISOString(),
  };
  messages.value.push(userMessage);
  if (messages.value.length > props.maxMessages) {
    messages.value.splice(0, messages.value.length - props.maxMessages);
  }
  markActivity(conversationId, userMessage.timestamp);
  
  await scrollToBottom();

  try {
    progress.value.stage = 'retrieve';
    // 1) vector search first: show sources immediately when available
    let retrievedSources: SourceReference[] = [];
    try {
      const vs = await aiApiClient.vectorSearch({ query: question, top_k: 3 });
      retrievedSources = vs.sources || [];
    } catch (_) {
      // ignore vector search failure; proceed to chat
    }

    // Prepare chat history
    const history = messages.value.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }));

    // Show a staged system message to indicate progress
    if (retrievedSources.length > 0 && showSources.value) {
      messages.value.push({
        role: 'assistant',
        content: '已根据知识库检索到相关文档，正在整理回答...',
        timestamp: new Date().toISOString(),
        sources: retrievedSources,
      } as any);
      await scrollToBottom();
    }

    progress.value.stage = 'generate';
    // 2) call AI to generate the final answer
    const response: ChatResponse = await aiApiClient.chat({
      question,
      history,
      include_sources: showSources.value,
      temperature: 0.1,
      conversation_id: conversationId,
    });

    // Merge sources (vector-search + final)
    const mergedSources = (response.sources && response.sources.length > 0)
      ? response.sources
      : retrievedSources;

    // Replace the staged system message if it exists
    const stagedIndex = messages.value.findIndex(
      (m) => m.role === 'assistant' && m.content.includes('正在整理回答')
    );
    if (stagedIndex !== -1) {
      messages.value.splice(stagedIndex, 1);
    }

    // 3) push final AI message with sources
    const aiMessage = {
      role: 'assistant' as const,
      content: response.answer,
      timestamp: new Date().toISOString(),
      sources: mergedSources,
    };
    messages.value.push(aiMessage);
    if (messages.value.length > props.maxMessages) {
      messages.value.splice(0, messages.value.length - props.maxMessages);
    }
    const resolvedConversationId = response.conversation_id || conversationId;
    if (resolvedConversationId !== conversationId) {
      currentConversationId.value = resolvedConversationId;
      setActive(resolvedConversationId);
    }
    markActivity(resolvedConversationId, aiMessage.timestamp);
    progress.value.stage = 'done';

    await maybeRenameConversation(resolvedConversationId, question);

  } catch (error) {
    hasError.value = true;
    errorMessage.value = getAIErrorMessage(error);
    console.error('AI chat error:', error);
  } finally {
    isLoading.value = false;
    await scrollToBottom();
    await nextTick();
    inputRef.value?.focus();
  }
};

const askSuggestedQuestion = (question: string) => {
  currentInput.value = question;
  sendMessage();
};

const retryLastQuestion = () => {
  if (lastQuestion.value) {
    currentInput.value = lastQuestion.value;
    sendMessage();
  }
};

const clearChat = () => {
  messages.value = [];
  errorMessage.value = '';
  hasError.value = false;
  if (props.persistHistory) {
    localStorage.removeItem('chatbot-history');
  }
};

const toggleSources = () => {
  showSources.value = !showSources.value;
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const autoResizeTextarea = () => {
  const textarea = inputRef.value;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

const formatMessage = (content: string) => {
  // 增强的消息格式化，让回复更友好易读
  return content
    // 处理代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    // 处理行内代码
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // 处理粗体
    .replace(/\*\*(.*?)\*\*/g, '<strong class="bold-text">$1</strong>')
    // 处理斜体
    .replace(/\*(.*?)\*/g, '<em class="italic-text">$1</em>')
    // 处理列表项
    .replace(/^\d+\.\s+(.+)$/gm, '<div class="list-item numbered">$1</div>')
    .replace(/^[-*]\s+(.+)$/gm, '<div class="list-item bullet">• $1</div>')
    // 处理标题
    .replace(/^### (.+)$/gm, '<h4 class="msg-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="msg-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="msg-h2">$1</h2>')
    // 处理换行，但保持段落结构
    .replace(/\n\n/g, '</p><p class="msg-paragraph">')
    .replace(/\n/g, '<br>')
    // 添加段落包装
    .replace(/^(.+)/, '<p class="msg-paragraph">$1')
    .replace(/(.+)$/, '$1</p>')
    // 清理可能的重复段落标签
    .replace(/<\/p><p class="msg-paragraph"><p class="msg-paragraph">/g, '</p><p class="msg-paragraph">');
};

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Persistence
const saveHistory = () => {
  if (props.persistHistory && !currentConversationId.value) {
    try {
      localStorage.setItem('chatbot-history', JSON.stringify(messages.value));
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  }
};

const loadHistory = () => {
  if (props.persistHistory && !currentConversationId.value) {
    try {
      const saved = localStorage.getItem('chatbot-history');
      if (saved) {
        messages.value = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
    }
  }
};

// Watchers
watch(messages, saveHistory, { deep: true });

// Lifecycle
onMounted(() => {
  loadHistory();
  
  // Health check on mount
  aiApiClient.checkHealth().catch(() => {
    hasError.value = true;
    errorMessage.value = 'AI 服务连接失败，请稍后重试';
  });
});

// Programmatic control API
const ask = async (question: string) => {
  if (!question) return;
  isExpanded.value = true;
  currentQuestion.value = question;
  await nextTick();
  currentInput.value = question;
  await sendMessage();
};

const open = async () => {
  isExpanded.value = true;
  await nextTick();
  inputRef.value?.focus();
};

const close = () => {
  isExpanded.value = false;
};

defineExpose({ ask, open, close, currentQuestion });
</script>

<style scoped>
.chatbot-window {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chatbot-window.inline-mode {
  position: relative;
  bottom: auto;
  right: auto;
  left: auto;
  z-index: auto;
  font-family: var(--font-family-sans);
}

/* Compact State */
.chatbot-compact {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 1rem 1.5rem;
  cursor: pointer;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  min-width: 280px;
}

.chatbot-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.compact-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: white;
}

.ai-icon {
  font-size: 1.5rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.compact-text h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.compact-text p {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.9;
}

.expand-indicator {
  margin-left: auto;
  font-size: 1.25rem;
  opacity: 0.8;
}

/* Expanded State */
.chatbot-expanded {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  width: 400px;
  height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Inline mode seamless styling */
.chatbot-window.inline-mode .chatbot-expanded {
  background: transparent;
  backdrop-filter: none;
  border-radius: 0;
  box-shadow: none;
  border: none;
  width: 100%;
  height: auto;
  min-height: 500px;
  max-height: 80vh;
  margin: 0;
  padding: 0;
}



@media (prefers-color-scheme: dark) {
  .chatbot-expanded {
    background: rgba(40, 40, 40, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e0e0e0;
  }
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px 16px 0 0;
  color: white;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ai-avatar {
  font-size: 1.5rem;
}

.header-text h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.status-text {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.9;
}

.collapse-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

/* Hide header in inline mode */
.chatbot-window.inline-mode .chat-header {
  display: none;
}

/* Inline mode messages styling */
.chatbot-window.inline-mode .messages-container {
  padding: 0 24px;
  background: transparent;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
}

.chatbot-window.inline-mode .messages-inner {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: calc(100% - 40px);
}

.progress-bar { display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 4px; color: #8a8a8a; font-size: 12px; }
.progress-dot { width: 16px; height: 16px; border-radius: 50%; background: #d9d9d9; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; }
.progress-dot.done { background: #667eea; }
.progress-line { height: 2px; width: 60px; background: #d9d9d9; }
.progress-line.done { background: #667eea; }
.progress-bar .active { color: #333; }

.conversation-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.conversation-status.error {
  color: #d04747;
}

.conversation-status .loading-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--color-primary);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.message {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: #667eea;
}

.ai-message .message-avatar {
  background: #764ba2;
}

.message-content {
  flex: 1;
  max-width: calc(100% - 48px);
}

.message-text {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 12px;
  line-height: 1.5;
  word-wrap: break-word;
}

/* Inline mode message styling */
.chatbot-window.inline-mode .message { margin: 6px 0; }
.chatbot-window.inline-mode .message-content { max-width: 100%; }

.chatbot-window.inline-mode .ai-message .message-text {
  background: #ffffff;
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
  font-size: 15px;
  line-height: 1.75;
  padding: 12px 14px;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.chatbot-window.inline-mode .user-message { justify-content: flex-end; }
.chatbot-window.inline-mode .user-message .message-text {
  background: var(--color-primary);
  color: #fff;
  border: none;
  font-size: 15px;
  line-height: 1.7;
  padding: 10px 14px;
  border-radius: 14px;
  width: fit-content;
  max-width: 80%;
  margin: 4px 0;
}

.chatbot-window.inline-mode .ai-message .message-text {
  background: transparent;
  padding: 0;
  font-size: 16px;
  line-height: 1.6;
}

.chatbot-window.inline-mode .message-avatar { display: none; }

.chatbot-window.inline-mode .ai-message .message-content {align-self: flex-start; }

/* Hide welcome message in inline mode */
.chatbot-window.inline-mode .welcome-message {
  display: none;
}

/* Perplexity-style Sources Layout */
.perplexity-sources {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  border-left: none !important;
  padding: 24px 0 !important;
  margin: 32px 0 !important;
}

.sources-header {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #374151 !important;
  margin: 0 0 12px 0 !important;
}

.sources-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.source-card {
  display: flex;
  align-items: flex-start;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  flex: 0 0 auto;
  min-width: 120px;
  max-width: 200px;
}

.source-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.source-number {
  background: #667eea;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  margin-right: 8px;
  flex-shrink: 0;
}

.source-content {
  flex: 1;
  min-width: 0;
}

.source-title {
  font-size: 11px;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.3;
  margin-bottom: 2px;
  display: -webkit-box;
  line-clamp: 1;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.source-score {
  font-size: 9px;
  color: #64748b;
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  .message-text {
    background: #2d2d2d;
  }
}

.user-message .message-text {
  background: #667eea;
  color: white;
  margin-left: auto;
}

.message-time {
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.25rem;
}

@media (prefers-color-scheme: dark) {
  .message-time {
    color: #999;
  }
}

/* Sources */
.message-sources {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.message-sources h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #667eea;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
}

/* Clickable source styling */
.source-item.clickable {
  cursor: pointer;
  border: 1px solid transparent;
}

.source-item.clickable:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.source-item.clickable:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(102, 126, 234, 0.2);
}

.source-title {
  font-weight: 500;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
}

.source-icon {
  font-size: 0.875rem;
  opacity: 0.7;
}

.source-score {
  color: #667eea;
  font-weight: 600;
  margin: 0 0.5rem;
}

.source-link-icon {
  font-size: 0.75rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.source-item.clickable:hover .source-link-icon {
  opacity: 1;
  transform: scale(1.1);
}

/* Welcome Message */
.welcome-message .message-content {
  max-width: 100%;
}

.suggested-questions {
  margin-top: 1rem;
}

.suggested-questions h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #666;
}

.suggested-question-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  color: #667eea;
}

.suggested-question-btn:hover {
  background: rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

/* Loading */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 0.75rem;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  30% {
    transform: scale(1);
    opacity: 1;
  }
}

.loading-text {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
}

/* Error Message */
.error-message .message-content {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 0.75rem;
}

.error-text {
  color: #c33;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.retry-btn {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #5a6fd8;
}

/* Input Area */
.input-area {
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 0 0 16px 16px;
}

/* Perplexity-style Input Area */
.chatbot-window.inline-mode .input-area {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  margin-top: 16px;
  padding: 8px 12px;
  position: sticky;
  bottom: 20px;
  z-index: 50;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

@media (prefers-color-scheme: dark) {
  .input-area {
    background: rgba(30, 30, 30, 0.8);
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}

.input-form {
  margin-bottom: 0.75rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 0.75rem;
  font-size: 0.875rem;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  min-height: 44px;
  max-height: 120px;
  font-family: inherit;
}

.message-input:focus {
  border-color: #667eea;
}

/* Perplexity-style Input Styling */
.chatbot-window.inline-mode .message-input {
  border: none;
  background: transparent;
  padding: 8px 12px;
  font-size: 15px;
  line-height: 1.6;
  min-height: 20px;
  max-height: 120px;
  resize: none;
  outline: none;
  color: var(--color-text-primary);
  font-weight: 400;
}

.chatbot-window.inline-mode .message-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.chatbot-window.inline-mode .send-btn {
  background: #667eea;
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  flex-shrink: 0;
}

.chatbot-window.inline-mode .send-btn:hover:not(:disabled) {
  background: #5a6fd8;
  transform: scale(1.05);
}

.chatbot-window.inline-mode .send-btn:disabled {
  background: #e2e8f0;
  cursor: not-allowed;
  transform: none;
}

.chatbot-window.inline-mode .input-group {
  align-items: center;
  gap: 12px;
}

/* Dark mode support for Perplexity-style elements */
@media (prefers-color-scheme: dark) {
  .sticky-question-header {
    background: var(--color-bg-primary, #1a1a1a);
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  
  .sources-header {
    color: #e2e8f0 !important;
  }
  
  .source-card {
    background: #2d3748;
    border-color: #4a5568;
  }
  
  .source-card:hover {
    background: #374151;
    border-color: #6b7280;
  }
  
  .source-title {
    color: #f7fafc;
  }
  
  .source-score {
    color: #a0aec0;
  }
  
  .chatbot-window.inline-mode .input-area {
    background: rgba(26, 32, 44, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .chatbot-window.inline-mode .message-input {
    color: #f7fafc;
  }
  
  .chatbot-window.inline-mode .message-input::placeholder {
    color: #718096;
  }
}

/* Mobile responsive styling */
@media (max-width: 768px) {
  
  .sticky-question-header {
    padding: 16px 0;
    margin-bottom: 24px;
  }
  
  .sources-grid {
    flex-direction: column;
    gap: 6px;
  }
  
  .source-card {
    padding: 6px 8px;
    min-width: auto;
    max-width: none;
  }
  
  .source-number {
    width: 16px;
    height: 16px;
    font-size: 9px;
    margin-right: 6px;
  }
  
  .source-title {
    font-size: 10px;
  }
  
  .source-score {
    font-size: 8px;
  }
  
  .chatbot-window.inline-mode .input-area {
    margin-top: 24px;
    padding: 6px 10px;
    border-radius: 14px;
    bottom: 12px;
    max-width: 95%;
  }
  
  .chatbot-window.inline-mode .message-input {
    font-size: 14px;
    padding: 6px 10px;
    min-height: 14px;
  }
  
  .chatbot-window.inline-mode .send-btn {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
}

@media (prefers-color-scheme: dark) {
  .message-input {
    background: #2d2d2d;
    border-color: rgba(255, 255, 255, 0.2);
    color: #e0e0e0;
  }
  
  .message-input:focus {
    border-color: #667eea;
  }
}

.send-btn {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #5a6fd8;
  transform: scale(1.05);
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.action-btn {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  color: #667eea;

}

.action-btn:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: #667eea;
}

@media (prefers-color-scheme: dark) {
  .action-btn {
    border-color: rgba(255, 255, 255, 0.2);
    color: #e0e0e0;
  }
  
  .action-btn:hover {
    background: rgba(102, 126, 234, 0.2);
    border-color: #667eea;
    color: #667eea;
  }
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .chatbot-window {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
  }
  
  .chatbot-expanded {
    width: 100%;
    height: 70vh;
  }
  
  .chatbot-compact {
    width: 100%;
    min-width: auto;
  }
}

/* High contrast and accessibility */
@media (prefers-contrast: high) {
  .chatbot-expanded {
    border: 2px solid #000;
  }
  
  .message-text {
    border: 1px solid #000;
  }
}

/* Message Content Formatting */
.message-text :deep(.code-block) {
  color: #f8f8f2;
  padding: 1rem;
  border-radius: 8px;
  margin: 0.5rem 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}

.message-text :deep(.inline-code) {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875em;
}

.message-text :deep(.bold-text) {
  color: #333;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .message-text :deep(.bold-text) {
    color: #fff;
  }
  
  .message-text :deep(.inline-code) {
    background: rgba(102, 126, 234, 0.2);
    color: #8fa6ff;
  }
}

.message-text :deep(.italic-text) {
  font-style: italic;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .message-text :deep(.italic-text) {
    color: #aaa;
  }
}

.message-text :deep(.list-item) {
  margin: 0.5rem 0;
  padding-left: 1rem;
  line-height: 1.6;
}

.message-text :deep(.list-item.numbered) {
  counter-increment: list-counter;
  position: relative;
}

.message-text :deep(.list-item.numbered)::before {
  content: counter(list-counter) ". ";
  position: absolute;
  left: -1rem;
  color: #667eea;
  font-weight: 600;
}

.message-text :deep(.list-item.bullet) {
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .message-text :deep(.list-item.bullet) {
    color: #e0e0e0;
  }
}

.message-text :deep(.msg-h2),
.message-text :deep(.msg-h3),
.message-text :deep(.msg-h4) {
  margin: 1rem 0 0.5rem 0;
  color: #667eea;
  font-weight: 600;
}

.message-text :deep(.msg-h2) {
  font-size: 1.25rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.25rem;
}

.message-text :deep(.msg-h3) {
  font-size: 1.125rem;
}

.message-text :deep(.msg-h4) {
  font-size: 1rem;
}

.message-text :deep(.msg-paragraph) {
  margin: 0.75rem 0;
  line-height: 1.6;
}

.message-text :deep(.msg-paragraph):first-child {
  margin-top: 0;
}

.message-text :deep(.msg-paragraph):last-child {
  margin-bottom: 0;
}

/* Counter reset for numbered lists */
.message-text {
  counter-reset: list-counter;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .chatbot-window,
  .chatbot-compact,
  .send-btn,
  .action-btn {
    transition: none;
  }
  
  .ai-icon {
    animation: none;
  }
  
  .typing-indicator span {
    animation: none;
  }
}
</style>
