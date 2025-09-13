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
    <div v-else class="chatbot-expanded" :style="inline ? { height: `${inlineHeight}px`, width: '100%', maxWidth: '860px', margin: '0 auto' } : {}">
      <!-- Header -->
      <div class="chat-header">
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
        <!-- Welcome Message -->
        <div v-if="messages.length === 0" class="welcome-message">
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
            
            <!-- Sources for AI messages -->
            <div v-if="message.sources && message.sources.length > 0" class="message-sources">
              <h5>📚 参考资料：</h5>
              <div class="sources-list">
                <div 
                  v-for="source in message.sources" 
                  :key="source.file_path + source.chunk_index"
                  class="source-item clickable"
                  @click="navigateToSource(source)"
                  :title="`点击跳转到：${source.title}`"
                >
                  <span class="source-title">
                    <span class="source-icon">📄</span>
                    {{ source.title }}
                  </span>
                  <span class="source-score">相似度: {{ Math.round(source.similarity_score * 100) }}%</span>
                  <span class="source-link-icon">🔗</span>
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
        
        <!-- Quick Actions -->
        <div class="quick-actions">
          <button @click="clearChat" class="action-btn clear-btn">
            🗑️ 清空对话
          </button>
          <button @click="toggleSources" class="action-btn sources-btn">
            {{ showSources ? '隐藏' : '显示' }}参考资料
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { aiApiClient, type ChatMessage, type ChatResponse, type SourceReference, getAIErrorMessage } from '@/api/ai';

// Props
interface Props {
  autoExpand?: boolean;
  maxMessages?: number;
  persistHistory?: boolean;
  inline?: boolean; // inline mode renders as block instead of fixed bubble
  inlineHeight?: number; // height for inline chat area
  hideCompact?: boolean; // hide compact bubble trigger
}

const props = withDefaults(defineProps<Props>(), {
  autoExpand: false,
  maxMessages: 100,
  persistHistory: true,
  inline: false,
  inlineHeight: 460,
  hideCompact: false,
});

// Router instance
const router = useRouter();

// Reactive state
const isExpanded = ref(props.autoExpand);
const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref('');
const currentInput = ref('');
const messages = ref<(ChatMessage & { sources?: SourceReference[] })[]>([]);
const showSources = ref(true);
const lastQuestion = ref('');

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

const sendMessage = async () => {
  const question = currentInput.value.trim();
  if (!question || isLoading.value) return;

  lastQuestion.value = question;
  currentInput.value = '';
  isLoading.value = true;
  hasError.value = false;
  errorMessage.value = '';

  // Add user message
  const userMessage: ChatMessage = {
    role: 'user',
    content: question,
    timestamp: new Date().toISOString(),
  };
  messages.value.push(userMessage);
  
  await scrollToBottom();

  try {
    // Prepare chat history
    const history = messages.value.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }));

    // Call AI service
    const response: ChatResponse = await aiApiClient.chat({
      question,
      history,
      include_sources: showSources.value,
      temperature: 0.1,
    });

    // Add AI response
    const aiMessage = {
      role: 'assistant' as const,
      content: response.answer,
      timestamp: new Date().toISOString(),
      sources: response.sources,
    };
    messages.value.push(aiMessage);

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
  if (props.persistHistory) {
    try {
      localStorage.setItem('chatbot-history', JSON.stringify(messages.value));
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  }
};

const loadHistory = () => {
  if (props.persistHistory) {
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

defineExpose({ ask, open, close });
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
