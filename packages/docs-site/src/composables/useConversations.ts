import { computed, ref } from 'vue';
import {
  aiApiClient,
  ConversationDetail,
  ConversationInfo,
} from '@/api/ai';

const conversations = ref<ConversationInfo[]>([]);
const activeConversationId = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
let initialized = false;
const drafting = ref(false);

const pendingLoad = ref<Promise<void> | null>(null);

const setConversations = (items: ConversationInfo[]) => {
  conversations.value = items.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
};

const setActiveInternal = (conversationId: string | null) => {
  activeConversationId.value = conversationId;
  drafting.value = conversationId === null;
};

const upsertConversation = (item: ConversationInfo) => {
  const rest = conversations.value.filter((c) => c.id !== item.id);
  conversations.value = [item, ...rest];
};

const updateConversation = (id: string, patch: Partial<ConversationInfo>) => {
  const idx = conversations.value.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const updated = { ...conversations.value[idx], ...patch } as ConversationInfo;
  const nextList = conversations.value.slice();
  nextList[idx] = updated;
  // Re-sort by updated_at so items only move when timestamp actually changes
  setConversations(nextList);
};

export function useConversations() {
  const ensureLoaded = async () => {
    if (initialized) return;
    if (pendingLoad.value) return pendingLoad.value;
    loading.value = true;
    const loadPromise = aiApiClient
      .listConversations()
      .then((items) => {
        setConversations(items);
        initialized = true;
        if (!activeConversationId.value && items.length > 0) {
          setActiveInternal(items[0].id);
        }
        error.value = null;
      })
      .catch((err) => {
        error.value = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        loading.value = false;
        pendingLoad.value = null;
      });

    pendingLoad.value = loadPromise;
    return loadPromise;
  };

  const refresh = async () => {
    loading.value = true;
    try {
      const items = await aiApiClient.listConversations();
      setConversations(items);
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  };

  const create = async (title?: string) => {
    const convo = await aiApiClient.createConversation(title ? { title } : undefined);
    upsertConversation(convo);
    setActiveInternal(convo.id);
    return convo;
  };

  const loadDetail = async (conversationId: string): Promise<ConversationDetail> => {
    const detail = await aiApiClient.getConversation(conversationId);
    if (detail) {
      // Do not change updated_at on a simple view to avoid reordering
      updateConversation(conversationId, { title: detail.title });
    }
    return detail;
  };

  const setActive = (conversationId: string | null) => setActiveInternal(conversationId);

  const markRenamed = (conversationId: string, title: string) => {
    updateConversation(conversationId, { title });
  };

  const markActivity = (conversationId: string, isoTimestamp?: string) => {
    updateConversation(conversationId, {
      updated_at: isoTimestamp ?? new Date().toISOString(),
    });
  };

  const remove = async (conversationId: string) => {
    await aiApiClient.deleteConversation(conversationId);
    const filtered = conversations.value.filter((c) => c.id !== conversationId);
    conversations.value = filtered;
    if (activeConversationId.value === conversationId) {
      setActiveInternal(filtered.length ? filtered[0].id : null);
    }
  };

  return {
    conversations,
    activeConversationId,
    loading,
    error,
    ensureLoaded,
    refresh,
    create,
    loadDetail,
    setActive,
    markRenamed,
    markActivity,
    remove,
    isDrafting: computed(() => drafting.value),
    hasConversations: computed(() => conversations.value.length > 0),
    activeConversation: computed(() =>
      conversations.value.find((c) => c.id === activeConversationId.value) || null,
    ),
  };
}
