import { ref, onMounted, type Ref } from "vue";
import { api, type Post, type ApiResponse } from "@/api";

export interface PostsState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePostsData(): PostsState {
  const posts: Ref<Post[]> = ref([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchPosts = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const response: ApiResponse<Post[]> = await api.getPosts();

      if (response.success && response.data) {
        // 只显示已发布的文章，按创建时间倒序排列
        posts.value = response.data.posts
          .filter((post) => post.published)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
      } else {
        throw new Error(
          response.message || response.error || "Failed to fetch posts",
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      error.value = errorMessage;
      console.error("Error fetching posts:", err);

      // Graceful degradation: 保持空数组，让组件可以fallback到静态内容
      posts.value = [];
    } finally {
      loading.value = false;
    }
  };

  const refresh = async (): Promise<void> => {
    await fetchPosts();
  };

  // 组件挂载时自动获取数据
  onMounted(() => {
    fetchPosts();
  });

  return {
    posts: posts.value,
    loading: loading.value,
    error: error.value,
    refresh,
  };
}

export default usePostsData;
