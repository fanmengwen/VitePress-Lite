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
        <!-- <div 
          v-if="inline && (currentQuestion || lastQuestion)"
          class="sticky-question-header"
        >
          <h2 class="question-title">{{ currentQuestion || lastQuestion }}</h2>
        </div> -->
        <div class="messages-inner">
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
            <div class="message-content">
              <template v-if="message.role === 'assistant'">
                <div 
                  v-if="message.sources && message.sources.length > 0 && showSources"
                  class="answer-sources"
                >
                  <div class="answer-sources-grid">
                    <div 
                      v-for="(source, index) in message.sources" 
                      :key="source.file_path + source.chunk_index"
                      class="answer-source-card"
                      @click="navigateToSource(source)"
                      :title="`点击跳转到：${source.title}`"
                    >
                      <div class="answer-source-index">{{ index + 1 }}</div>
                      <div class="answer-source-body">
                        <div class="answer-source-domain">{{ (source.file_path || '').split('/')[0] || '文档' }}</div>
                        <div class="answer-source-desc">{{ source.title }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <div class="message-text" v-html="formatMessage(message.content)"></div>
            </div>
          </div>

          <!-- Retrieval status & preview -->
          <transition name="fade-slide">
            <div 
              v-if="isLoading && showRetrievalBanner && (progress.stage === 'retrieve' || progress.stage === 'generate')"
              class="retrieval-status"
            >
              <div class="retrieval-banner">
                <span class="retrieval-glow"></span>
                <span class="retrieval-text">
                  {{ progress.stage === 'retrieve' ? '已检索到相关文档，正在分析内容…' : 'AI 正在整理回答，请稍候…' }}
                </span>
              </div>
              <div v-if="showSources" class="retrieval-sources">
                <div 
                  v-if="retrievalPreviewSources.length > 0"
                  class="retrieval-sources-grid"
                >
                  <div 
                    v-for="(source, index) in retrievalPreviewSources" 
                    :key="`retrieval-${source.file_path}-${source.chunk_index}`"
                    class="retrieval-source-card"
                  >
                    <div class="retrieval-source-badge">{{ index + 1 }}</div>
                    <div class="retrieval-source-meta">
                      <div class="retrieval-source-domain">{{ (source.file_path || '').split('/')[0] || '文档' }}</div>
                      <div class="retrieval-source-title" :title="source.title">{{ source.title }}</div>
                    </div>
                  </div>
                </div>
                <div v-else class="retrieval-sources-grid skeleton">
                  <div class="retrieval-source-card skeleton-card" v-for="n in 3" :key="`skeleton-${n}`">
                    <div class="retrieval-source-badge shimmering"></div>
                    <div class="retrieval-source-meta">
                      <div class="shimmer-line short"></div>
                      <div class="shimmer-line"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>

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
  loadDetail,
  refresh,
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
const retrievalPreviewSources = ref<SourceReference[]>([]);
const showRetrievalBanner = ref(false);
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
  retrievalPreviewSources.value = [];
  showRetrievalBanner.value = false;
  hasRenamedCurrentConversation.value = false;
  currentQuestion.value = '';
  lastQuestion.value = '';
};

const hydrateConversation = (detail: ConversationDetail) => {
  const hydrated = detail.messages.map((msg) => {
    const base = {
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp:
        typeof msg.timestamp === 'string'
          ? msg.timestamp
          : new Date(msg.timestamp).toISOString(),
    } as ChatMessage & { sources?: SourceReference[] };
    if (msg.sources && msg.sources.length > 0) {
      base.sources = msg.sources;
    }
    return base;
  });
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

const ensureConversation = async (): Promise<string | null> => {
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
  return null;
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
    // Skip only when already loaded for this id and no error
    if (
      newId === currentConversationId.value &&
      messages.value.length > 0 &&
      !historyError.value
    ) {
      return;
    }
    loadConversation(newId);
  },
  { immediate: true },
);

watch(
  activeConversationId,
  async (newId) => {
    // If parent controls via prop, don't auto-load by active id
    if (props.conversationId) return;

    // No active id → reset
    if (!newId) {
      currentConversationId.value = null;
      resetConversationState();
      return;
    }

    // Skip duplicate loads if already hydrated and no error
    if (newId === currentConversationId.value && messages.value.length > 0 && !historyError.value) {
      return;
    }

    currentConversationId.value = newId;
    await loadConversation(newId);
  },
  { immediate: true },
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

  let conversationId: string | null = null;
  try {
    conversationId = await ensureConversation();
  } catch (error) {
    isLoading.value = false;
    hasError.value = true;
    errorMessage.value = getAIErrorMessage(error);
    return;
  }
  if (conversationId) {
    currentConversationId.value = conversationId;
  }

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
  // Move conversation to top only when user actually sends a message
  if (conversationId) {
    markActivity(conversationId, userMessage.timestamp);
  }
  
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

    // Present a retrieval banner instead of inserting a staged message
    showRetrievalBanner.value = true;
    retrievalPreviewSources.value = showSources.value ? retrievedSources : [];

    progress.value.stage = 'generate';
    // 2) call AI to generate the final answer
    const response: ChatResponse = await aiApiClient.chat({
      question,
      history,
      include_sources: showSources.value,
      temperature: 0.1,
      conversation_id: conversationId ?? undefined,
    });

    // Merge sources (vector-search + final)
    const mergedSources = (response.sources && response.sources.length > 0)
      ? response.sources
      : retrievedSources;

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
    if (resolvedConversationId) {
      const wasNewConversation = !conversationId;
      if (resolvedConversationId !== currentConversationId.value) {
        currentConversationId.value = resolvedConversationId;
        setActive(resolvedConversationId);
      }
      if (wasNewConversation) {
        await refresh().catch(() => {});
      }
      markActivity(resolvedConversationId, aiMessage.timestamp);
      progress.value.stage = 'done';
      await maybeRenameConversation(resolvedConversationId, question);
    } else {
      progress.value.stage = 'done';
    }

    retrievalPreviewSources.value = [];
    showRetrievalBanner.value = false;

  } catch (error) {
    hasError.value = true;
    errorMessage.value = getAIErrorMessage(error);
    console.error('AI chat error:', error);
  } finally {
    if (progress.value.stage !== 'done') {
      progress.value.stage = '';
    }
    retrievalPreviewSources.value = [];
    showRetrievalBanner.value = false;
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
  font-family: var(--font-family-sans);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 26px 52px rgba(10, 132, 255, 0.16));
}

.chatbot-window.inline-mode {
  position: relative;
  bottom: auto;
  right: auto;
  left: auto;
  z-index: auto;
  font-family: var(--font-family-sans);
  filter: none;
}

/* Compact State */
.chatbot-compact {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.92) 0%, rgba(94, 231, 255, 0.85) 100%);
  border-radius: 20px;
  padding: 1rem 1.6rem;
  cursor: pointer;
  box-shadow: 0 24px 48px rgba(10, 132, 255, 0.28);
  transition: all 0.3s ease;
  min-width: 280px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: saturate(160%) blur(16px);
  -webkit-backdrop-filter: saturate(160%) blur(16px);
  position: relative;
  overflow: hidden;
}

.chatbot-compact::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 55%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chatbot-compact:hover {
  transform: translateY(-3px);
  box-shadow: 0 30px 60px rgba(10, 132, 255, 0.32);
}

.chatbot-compact:hover::after {
  opacity: 1;
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
  background: var(--glass-panel-bg-strong);
  backdrop-filter: saturate(180%) blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: saturate(180%) blur(calc(var(--glass-blur) + 4px));
  border-radius: 24px;
  width: 400px;
  height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--glass-panel-shadow);
  border: 1px solid var(--glass-panel-border);
  position: relative;
  overflow: hidden;
}

.chatbot-expanded::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0) 58%),
    radial-gradient(70% 70% at 82% 0%, rgba(94, 231, 255, 0.24) 0%, rgba(94, 231, 255, 0) 68%);
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.85;
}

/* Inline mode seamless styling */
.chatbot-window.inline-mode .chatbot-expanded {
  background: linear-gradient(192deg, rgba(255, 255, 255, 0.36) 0%, rgba(255, 255, 255, 0.12) 100%);
  backdrop-filter: blur(calc(var(--glass-blur) - 10px)) saturate(150%);
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) - 10px)) saturate(150%);
  border-radius: 26px;
  box-shadow: 0 22px 52px -28px rgba(12, 26, 57, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.24);
  width: 100%;
  height: auto;
  min-height: 480px;
  max-height: 78vh;
  margin: 0;
  padding: 12px 0 24px;
}



@media (prefers-color-scheme: dark) {
  .chatbot-expanded {
    background: var(--glass-panel-bg);
    border: 1px solid var(--glass-panel-border);
    color: #f4f8ff;
    box-shadow: var(--glow-subtle);
  }

  .chatbot-expanded::before {
    background:
      linear-gradient(160deg, rgba(94, 231, 255, 0.18) 0%, rgba(94, 231, 255, 0) 62%),
      radial-gradient(70% 70% at 80% 0%, rgba(94, 92, 230, 0.26) 0%, rgba(94, 92, 230, 0) 68%);
  }

  .chat-header {
    color: #f4f8ff;
    border-bottom: 1px solid rgba(94, 129, 190, 0.28);
    background: linear-gradient(135deg, rgba(14, 26, 48, 0.7) 0%, rgba(8, 17, 34, 0.55) 100%);
  }

  .status-text {
    color: rgba(226, 232, 255, 0.65);
  }

  .collapse-btn {
    background: rgba(14, 26, 48, 0.6);
    border-color: rgba(94, 129, 190, 0.35);
    color: #5ac8fa;
  }

  .collapse-btn:hover {
    background: rgba(94, 231, 255, 0.2);
    color: #5ac8fa;
    box-shadow: 0 20px 40px rgba(4, 12, 30, 0.82);
  }

  .sticky-question-header {
    background: rgba(14, 26, 48, 0.65);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 20px 40px rgba(1, 8, 24, 0.7);
  }
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.28);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.08) 100%);
  border-radius: 24px 24px 0 0;
  color: var(--color-text-primary);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  position: relative;
  z-index: 1;
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
  opacity: 0.72;
  color: rgba(66, 80, 103, 0.8);
}

.collapse-btn {
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  color: var(--color-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-base), background var(--transition-base), box-shadow var(--transition-base);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
}

.collapse-btn:hover {
  background: rgba(10, 132, 255, 0.14);
  color: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 16px 32px rgba(10, 132, 255, 0.18);
}

/* Messages */
.messages-container {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.messages-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 12px 24px;
  box-sizing: border-box;
}

/* Hide header in inline mode */
.chatbot-window.inline-mode .chat-header {
  display: none;
}

/* Inline mode messages styling */
.chatbot-window.inline-mode .messages-container {
  padding: 0 32px 28px;
  background: transparent;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
}

.chatbot-window.inline-mode .messages-inner {
  max-width: 760px;
}

/* Sticky question header (top question) */

.sticky-question-header {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.38);
  padding: 12px 16px;
  margin-bottom: 16px;
  z-index: 10;
  border-radius: 18px;
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  box-shadow: 0 20px 38px rgba(15, 23, 42, 0.12);
}

.question-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.4;
  font-weight: 600;
}

.progress-bar { display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 4px; color: rgba(66, 80, 103, 0.7); font-size: 12px; }
.progress-dot { width: 16px; height: 16px; border-radius: 50%; background: rgba(10, 132, 255, 0.18); display: flex; align-items: center; justify-content: center; color: var(--color-text-primary); font-size: 10px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65); }
.progress-dot.done { background: rgba(10, 132, 255, 0.95); color: #fff; }
.progress-line { height: 2px; width: 60px; background: rgba(10, 132, 255, 0.2); border-radius: 999px; }
.progress-line.done { background: rgba(10, 132, 255, 0.65); }
.progress-bar .active { color: var(--color-primary); }

.conversation-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 0;
  color: rgba(66, 80, 103, 0.75);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 14px;
  padding: 10px 16px;
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.conversation-status.error {
  color: #ff453a;
  background: rgba(255, 69, 58, 0.12);
  border-color: rgba(255, 69, 58, 0.25);
}

.conversation-status .loading-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(10, 132, 255, 0.18);
  border-top-color: var(--color-primary);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-color-scheme: dark) {
  .conversation-status {
    color: rgba(226, 232, 255, 0.7);
    background: rgba(14, 26, 48, 0.6);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 20px 40px rgba(1, 8, 24, 0.65);
  }

  .conversation-status.error {
    background: rgba(255, 69, 58, 0.2);
    border-color: rgba(255, 149, 128, 0.38);
    color: #ffb4ad;
  }
}


.message {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  padding: 4px 0 28px;
}

.message.user-message {
  align-items: flex-end;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(118, 189, 255, 0.9) 0%, rgba(176, 236, 255, 0.82) 100%);
  color: #fff;
  box-shadow: 0 16px 32px rgba(10, 132, 255, 0.28);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
}

.message.user-message .message-avatar {
  background: linear-gradient(135deg, rgba(118, 189, 255, 0.92) 0%, rgba(176, 236, 255, 0.86) 100%);
  box-shadow: 0 18px 36px rgba(118, 189, 255, 0.26);
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: min(720px, 100%);
}

.message.user-message .message-content {
  align-items: flex-end;
}

.message.ai-message .message-content {
  align-items: flex-start;
}

.message-text {
  max-width: 100%;
  word-break: break-word;
  color: var(--color-text-primary, #0f172a);
  font-size: 16px;
  line-height: 1.78;
}

.message.ai-message .message-text {
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.42);
  padding: 14px 18px;
  border-radius: 18px 18px 18px 6px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
}

.message.user-message .message-text {
  background: linear-gradient(135deg, rgba(118, 189, 255, 0.92) 0%, rgba(176, 236, 255, 0.9) 100%);
  color: #04305b;
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 20px 6px 20px 20px;
  box-shadow: 0 20px 40px rgba(118, 189, 255, 0.3);
  padding: 12px 18px;
  max-width: clamp(200px, 60%, 420px);
  text-align: left;
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
}

/* Inline mode message styling */
.chatbot-window.inline-mode .message { margin: 20px 0 32px; padding-bottom: 0; }
.chatbot-window.inline-mode .message-content { max-width: 740px; }
.chatbot-window.inline-mode .ai-message .message-text {
  font-size: 17px;
  line-height: 1.82;
  width: 100%;
}
.chatbot-window.inline-mode .user-message .message-text {
  background: linear-gradient(135deg, rgba(118, 189, 255, 0.9) 0%, rgba(176, 236, 255, 0.86) 100%);
  color: #04305b;
  border-radius: 24px 6px 24px 24px;
  padding: 12px 20px;
  border: 1px solid rgba(255, 255, 255, 0.34);
  box-shadow: 0 24px 46px rgba(118, 189, 255, 0.28);
}
.chatbot-window.inline-mode .message-avatar { display: none; }
.chatbot-window.inline-mode .ai-message .message-content { align-items: flex-start; }



/* Answer sources */
.answer-sources {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-sources-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.answer-sources-grid::-webkit-scrollbar {
  display: none;
}

.answer-source-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 14px;
  padding: 12px 16px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  min-width: clamp(220px, 30%, 260px);
  flex: 0 0 auto;
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.answer-source-card:hover {
  transform: translateY(-2px);
  border-color: rgba(10, 132, 255, 0.45);
  box-shadow: 0 24px 44px rgba(10, 132, 255, 0.22);
}

.answer-source-index {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: rgba(10, 132, 255, 0.18);
  color: var(--color-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
}

.answer-source-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.answer-source-domain {
  font-size: 11px;
  color: rgba(66, 80, 103, 0.72);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.answer-source-desc {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Retrieval preview */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.retrieval-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 8px 0 28px;
  width: 100%;
}

.retrieval-banner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.16) 0%, rgba(94, 231, 255, 0.12) 100%);
  color: rgba(10, 21, 40, 0.82);
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.32);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.retrieval-glow {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 6px rgba(10, 132, 255, 0.2);
  animation: pulse-glow 1.8s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(0.85);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
}

.retrieval-text {
  position: relative;
}

.retrieval-sources {
  width: 100%;
}

.retrieval-sources-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.retrieval-sources-grid::-webkit-scrollbar {
  display: none;
}

.retrieval-source-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.36);
  min-width: clamp(200px, 28%, 240px);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  pointer-events: none;
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.retrieval-source-badge {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(10, 132, 255, 0.18);
  color: var(--color-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
}

.retrieval-source-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.retrieval-source-domain {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(66, 80, 103, 0.7);
  font-weight: 600;
}

.retrieval-source-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.32;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retrieval-sources-grid.skeleton .retrieval-source-card {
  position: relative;
  overflow: hidden;
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(226, 232, 240, 0.65);
}

.shimmer-line,
.retrieval-source-badge.shimmering {
  background: linear-gradient(90deg, rgba(226, 232, 240, 0.2) 0%, rgba(148, 163, 184, 0.45) 50%, rgba(226, 232, 240, 0.2) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.6s infinite;
}

.shimmer-line {
  height: 10px;
  border-radius: 999px;
}

.shimmer-line.short {
  width: 90px;
}

.shimmer-line:not(.short) {
  width: 150px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@media (prefers-color-scheme: dark) {
  .message.ai-message .message-text {
    color: #f4f8ff;
    background: rgba(14, 26, 48, 0.7);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 22px 44px rgba(1, 8, 24, 0.65);
  }

  .message.user-message .message-text {
    background: linear-gradient(135deg, rgba(118, 189, 255, 0.45) 0%, rgba(176, 236, 255, 0.32) 100%);
    color: #e6f4ff;
    box-shadow: 0 24px 48px rgba(35, 113, 180, 0.45);
    border-color: rgba(148, 191, 255, 0.3);
  }

  .answer-source-card {
    background: rgba(14, 26, 48, 0.62);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 20px 40px rgba(1, 8, 24, 0.65);
  }

  .answer-source-domain {
    color: rgba(226, 232, 255, 0.65);
  }

  .answer-source-desc {
    color: #f4f8ff;
  }

  .retrieval-banner {
    background: linear-gradient(135deg, rgba(94, 231, 255, 0.2) 0%, rgba(94, 92, 230, 0.18) 100%);
    color: #f4f8ff;
    border-color: rgba(94, 231, 255, 0.28);
    box-shadow: 0 22px 48px rgba(1, 8, 24, 0.65);
  }

  .retrieval-source-card {
    background: rgba(14, 26, 48, 0.6);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 20px 40px rgba(1, 8, 24, 0.68);
  }

  .retrieval-source-domain {
    color: rgba(226, 232, 255, 0.6);
  }

  .retrieval-source-title {
    color: #f4f8ff;
  }

  .shimmer-line,
  .retrieval-source-badge.shimmering {
    background: linear-gradient(90deg, rgba(14, 26, 48, 0.32) 0%, rgba(148, 191, 255, 0.42) 50%, rgba(14, 26, 48, 0.32) 100%);
  }
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
  color: rgba(66, 80, 103, 0.78);
}

.suggested-question-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  color: var(--color-primary);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}

.suggested-question-btn:hover {
  background: rgba(10, 132, 255, 0.16);
  border-color: rgba(10, 132, 255, 0.45);
  box-shadow: 0 16px 34px rgba(10, 132, 255, 0.2);
}

@media (prefers-color-scheme: dark) {
  .suggested-question-btn {
    background: rgba(14, 26, 48, 0.6);
    border-color: rgba(94, 129, 190, 0.32);
    color: #5ac8fa;
    box-shadow: 0 18px 32px rgba(1, 8, 24, 0.65);
  }

  .suggested-question-btn:hover {
    background: rgba(94, 231, 255, 0.2);
    border-color: rgba(94, 231, 255, 0.42);
    box-shadow: 0 22px 40px rgba(1, 10, 28, 0.75);
  }
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
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.95) 0%, rgba(94, 231, 255, 0.85) 100%);
  animation: typing 1.4s infinite ease-in-out;
  box-shadow: 0 6px 14px rgba(10, 132, 255, 0.24);
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
  font-size: 0.9rem;
  color: rgba(66, 80, 103, 0.72);
  margin: 0;
}

.loading-message {
  flex-direction: row;
  align-items: center;
  gap: 14px;
  padding-bottom: 28px;
}

.loading-message .message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  box-shadow: 0 16px 32px rgba(10, 132, 255, 0.24);
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.95) 0%, rgba(94, 231, 255, 0.85) 100%);
}

.loading-message .message-content {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

/* Error Message */
.error-message .message-content {
  background: rgba(255, 69, 58, 0.12);
  border: 1px solid rgba(255, 69, 58, 0.25);
  border-radius: 14px;
  padding: 0.85rem;
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  box-shadow: 0 18px 34px rgba(255, 69, 58, 0.18);
}

.error-text {
  color: #ff453a;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.retry-btn {
  background: linear-gradient(135deg, rgba(255, 110, 102, 0.95) 0%, rgba(255, 149, 128, 0.88) 100%);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 10px;
  padding: 0.35rem 0.9rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
  box-shadow: 0 16px 32px rgba(255, 110, 102, 0.22);
}

.retry-btn:hover {
  background: linear-gradient(135deg, rgba(255, 110, 102, 1) 0%, rgba(255, 149, 128, 0.95) 100%);
  transform: translateY(-1px);
  box-shadow: 0 22px 40px rgba(255, 110, 102, 0.28);
}

/* Input Area */
.input-area {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.55);
  border-radius: 0 0 24px 24px;
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.08);
}

/* Perplexity-style Input Area */
.chatbot-window.inline-mode .input-area {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 18px;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
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
    background: rgba(10, 18, 35, 0.7);
    border-top-color: rgba(94, 129, 190, 0.3);
    box-shadow: 0 -10px 32px rgba(1, 8, 24, 0.65);
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
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  resize: none;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  background: rgba(255, 255, 255, 0.6);
  color: var(--color-text-primary);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  max-height: 120px;
  font-family: inherit;
}

.message-input:focus {
  border-color: rgba(10, 132, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.15);
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
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.95) 0%, rgba(94, 231, 255, 0.88) 100%);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 12px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
  font-size: 14px;
  flex-shrink: 0;
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  box-shadow: 0 18px 36px rgba(10, 132, 255, 0.24);
}

.chatbot-window.inline-mode .send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(10, 132, 255, 1) 0%, rgba(94, 231, 255, 0.92) 100%);
  transform: translateY(-2px);
  box-shadow: 0 24px 44px rgba(10, 132, 255, 0.3);
}

.chatbot-window.inline-mode .send-btn:disabled {
  background: rgba(255, 255, 255, 0.32);
  border-color: rgba(255, 255, 255, 0.28);
  color: rgba(66, 80, 103, 0.5);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
    background: rgba(14, 26, 48, 0.6);
    border-color: rgba(94, 129, 190, 0.35);
    color: #f4f8ff;
    box-shadow: inset 0 1px 0 rgba(148, 191, 255, 0.25);
  }
  
  .message-input:focus {
    border-color: rgba(94, 231, 255, 0.45);
    box-shadow: 0 0 0 3px rgba(94, 231, 255, 0.18);
  }
}

.send-btn {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.95) 0%, rgba(94, 231, 255, 0.88) 100%);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
  flex-shrink: 0;
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  box-shadow: 0 22px 48px rgba(10, 132, 255, 0.28);
}

.send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(10, 132, 255, 1) 0%, rgba(94, 231, 255, 0.92) 100%);
  transform: translateY(-2px);
  box-shadow: 0 28px 56px rgba(10, 132, 255, 0.32);
}

.send-btn:disabled {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.26);
  color: rgba(66, 80, 103, 0.5);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.action-btn {
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  color: var(--color-primary);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}

.action-btn:hover {
  background: rgba(10, 132, 255, 0.16);
  border-color: rgba(10, 132, 255, 0.45);
  color: var(--color-primary-dark);
  box-shadow: 0 16px 36px rgba(10, 132, 255, 0.22);
}

@media (prefers-color-scheme: dark) {
  .action-btn {
    border-color: rgba(94, 129, 190, 0.32);
    background: rgba(14, 26, 48, 0.58);
    color: #f4f8ff;
    box-shadow: 0 16px 32px rgba(1, 8, 24, 0.68);
  }
  
  .action-btn:hover {
    background: rgba(94, 231, 255, 0.18);
    border-color: rgba(94, 231, 255, 0.42);
    color: #5ac8fa;
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
  display: block;
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.38);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  color: var(--color-text-primary);
  padding: 16px 18px;
  border-radius: 16px;
  margin: 0.75rem 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.92rem;
  line-height: 1.6;
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.message-text :deep(.code-block code) {
  display: block;
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  color: inherit;
  padding: 0;
  margin: 0;
  line-height: inherit;
  font-size: inherit;
  overflow-wrap: anywhere;
}

.message-text :deep(.inline-code) {
  background: rgba(10, 132, 255, 0.12);
  color: var(--color-primary);
  padding: 0.125rem 0.45rem;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
  box-shadow: 0 6px 16px rgba(10, 132, 255, 0.1);
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
    background: rgba(94, 231, 255, 0.18);
    color: #5ac8fa;
    box-shadow: none;
  }

  .message-text :deep(.code-block) {
    background: rgba(14, 26, 48, 0.68);
    border-color: rgba(94, 129, 190, 0.32);
    box-shadow: 0 24px 48px rgba(1, 8, 24, 0.7);
    color: #f4f8ff;
  }
}

.message-text :deep(.italic-text) {
  font-style: italic;
  color: rgba(66, 80, 103, 0.65);
}

@media (prefers-color-scheme: dark) {
  .message-text :deep(.italic-text) {
    color: rgba(226, 232, 255, 0.65);
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
  color: var(--color-primary);
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
  color: var(--color-primary);
  font-weight: 600;
}

.message-text :deep(.msg-h2) {
  font-size: 1.25rem;
  border-bottom: 2px solid rgba(10, 132, 255, 0.35);
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
