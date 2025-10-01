/**
 * AI service API client for chat functionality.
 * Provides TypeScript interface for AI-powered documentation Q&A.
 */

import axios, { AxiosResponse } from 'axios';

// AI API Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: SourceReference[];
}

export interface SourceReference {
  title: string;
  file_path: string;
  chunk_index: number;
  similarity_score: number;
  content_preview: string;
}

export interface ChatRequest {
  question: string;
  conversation_id?: string;
  history?: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  include_sources?: boolean;
}

export interface ChatResponse {
  answer: string;
  sources: SourceReference[];
  confidence_score?: number;
  response_time_ms: number;
  tokens_used?: number;
  conversation_id?: string;
}

export type ChatStage = 'retrieve' | 'generate' | 'done';

export type ChatStreamEvent =
  | { type: 'stage'; stage: ChatStage }
  | { type: 'sources'; stage?: ChatStage; sources: SourceReference[] }
  | { type: 'token'; token: string }
  | ({ type: 'final'; stage: ChatStage } & ChatResponse)
  | { type: 'error'; message: string };

export interface AIHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  vector_db_status: string;
  llm_status: string;
  documents_indexed: number;
}

export interface AISystemInfo {
  vector_store: {
    total_documents: number;
    unique_authors: number;
    unique_titles: number;
    unique_tags: number;
    collection_name: string;
    embedding_dimension: number;
  };
  llm_service: {
    status: string;
    provider: string;
    model?: string;
  };
  config: {
    retrieval_top_k: number;
    similarity_threshold: number;
    chunk_size: number;
    chunk_overlap: number;
    embedding_model: string;
    llm_provider: string;
  };
}

export interface VectorSearchRequest {
  query: string;
  top_k?: number;
  similarity_threshold?: number;
}

export interface VectorSearchResponse {
  sources: SourceReference[];
  took_ms: number;
}

export interface ConversationInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export interface RenameConversationResponse {
  title: string;
}

// AI API Client
class AIApiClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Send a chat request to the AI service
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response: AxiosResponse<ChatResponse> = await axios.post(
        `${this.baseURL}/chat`,
        {
          question: request.question,
          conversation_id: request.conversation_id,
          history: request.history || [],
          max_tokens: request.max_tokens,
          temperature: request.temperature,
          include_sources: request.include_sources ?? true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`AI chat request failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Stream a chat request for progressive rendering
   */
  async chatStream(
    request: ChatRequest,
    onEvent?: (event: ChatStreamEvent) => void | Promise<void>,
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: request.question,
        conversation_id: request.conversation_id,
        history: request.history || [],
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        include_sources: request.include_sources ?? true,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AI chat stream failed: ${message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Browser does not support streaming responses.');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let finalPayload: ChatResponse | null = null;

    const processLine = async (line: string) => {
      if (!line) return;
      try {
        const parsed = JSON.parse(line) as ChatStreamEvent;
        if (onEvent) {
          await onEvent(parsed);
        }
        if (parsed.type === 'error') {
          throw new Error(parsed.message);
        }
        if (parsed.type === 'final') {
          const { type, stage, ...rest } = parsed;
          finalPayload = rest as ChatResponse;
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.warn('Failed to parse chat stream chunk:', line);
          return;
        }
        throw error;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        await processLine(line);
        newlineIndex = buffer.indexOf('\n');
      }
    }

    buffer += decoder.decode();
    const remaining = buffer.trim();
    if (remaining) {
      await processLine(remaining);
    }

    if (!finalPayload) {
      throw new Error('Chat stream ended without final response.');
    }

    return finalPayload;
  }

  /**
   * Vector search first for progressive UI
   */
  async vectorSearch(request: VectorSearchRequest): Promise<VectorSearchResponse> {
    const response = await axios.post<VectorSearchResponse>(
      `${this.baseURL}/vector-search`,
      request,
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    return response.data;
  }

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<AIHealthResponse> {
    try {
      const response: AxiosResponse<AIHealthResponse> = await axios.get(
        `${this.baseURL.replace('/api', '')}/health`, // Health endpoint is at root
        { timeout: 5000 }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Health check failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get AI system information (requires authentication)
   */
  async getSystemInfo(apiKey?: string): Promise<AISystemInfo> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response: AxiosResponse<AISystemInfo> = await axios.get(
        `${this.baseURL.replace('/api', '')}/system-info`,
        { headers, timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('API key required for system information');
        }
        throw new Error(`System info request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get vector store statistics
   */
  async getVectorStoreStats(apiKey?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await axios.get(
        `${this.baseURL}/vector-store/stats`,
        { headers, timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('API key required for vector store statistics');
        }
        throw new Error(`Vector store stats request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Conversations API
   */
  async listConversations(params?: { limit?: number; offset?: number }): Promise<ConversationInfo[]> {
    const response = await axios.get<ConversationInfo[]>(`${this.baseURL}/conversations`, {
      params,
      timeout: 10000,
    });
    return response.data;
  }

  async createConversation(payload?: { title?: string }): Promise<ConversationInfo> {
    const response = await axios.post<ConversationInfo>(
      `${this.baseURL}/conversations`,
      payload ?? {},
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );
    return response.data;
  }

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const response = await axios.get<ConversationDetail>(
      `${this.baseURL}/conversations/${conversationId}`,
      { timeout: 10000 }
    );
    return response.data;
  }

  async renameConversation(conversationId: string, title: string): Promise<RenameConversationResponse> {
    const response = await axios.patch<RenameConversationResponse>(
      `${this.baseURL}/conversations/${conversationId}`,
      { title },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    return response.data;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/conversations/${conversationId}`, { timeout: 10000 });
  }
}

// Utility functions
export const formatChatMessage = (role: 'user' | 'assistant', content: string): ChatMessage => ({
  role,
  content,
  timestamp: new Date().toISOString(),
});

export const createChatRequest = (
  question: string,
  options: Partial<ChatRequest> = {}
): ChatRequest => ({
  question,
  include_sources: true,
  ...options,
});

// Error handling utilities
export const isAIServiceError = (error: any): boolean => {
  return error?.message?.includes('AI') || error?.message?.includes('chat');
};

export const getAIErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) {
      return 'Invalid question format. Please check your input.';
    }
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.response?.status === 500) {
      return 'AI service is temporarily unavailable. Please try again later.';
    }
    if (error.response?.status === 503) {
      return 'AI service is under maintenance. Please try again later.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. The AI service is taking too long to respond.';
    }
    if (error.code === 'ECONNREFUSED') {
      return 'Cannot connect to AI service. Please check if the service is running.';
    }
  }
  
  return error?.message || 'An unexpected error occurred with the AI service.';
};

// Export singleton instance
export const aiApiClient = new AIApiClient();

// Export default for convenient importing
export default aiApiClient; 
