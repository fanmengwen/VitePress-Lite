<template>
  <aside class="side-nav">
    <div class="brand">
      <router-link to="/" class="brand-link">
        <span class="brand-icon">🧠</span>
        <span class="brand-text">VitePress-Lite</span>
      </router-link>
    </div>

    <nav class="menu">
      <router-link to="/" class="menu-item" active-class="active">
        <span class="icon">🔍</span>
        <span>搜索</span>
      </router-link>
      <router-link to="/kb" class="menu-item" active-class="active">
        <span class="icon">📚</span>
        <span>知识库</span>
      </router-link>
      <!-- <router-link to="/favorites" class="menu-item" active-class="active">
        <span class="icon">⭐</span>
        <span>收藏</span>
      </router-link>
      <router-link to="/history" class="menu-item" active-class="active">
        <span class="icon">🕘</span>
        <span>历史</span>
      </router-link> -->
      <a
          :href="githubUrl"
          class="menu-item"
          target="_blank"
          rel="noopener noreferrer"
          :title="githubUrl"
        >
          <svg class="nav-icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8 16 3.58 12.42 0 8 0z"/>
          </svg>
          <span>GitHub</span>
        </a>
    </nav>

    <div class="more">
      <div class="more-title">更早</div>
      <a href="#" class="more-item">阿里云百炼平台</a>
      <a href="#" class="more-item">阿里云百炼平台</a>
    </div>

    <footer class="user">
      <div class="avatar">🧑</div>
      <div class="user-name">十一</div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
// Side navigation for the left column of the homepage
const githubUrl = (import.meta.env.VITE_GITHUB_REPO_URL as string) || 'https://github.com/fanmengwen/VitePress-Lite'
</script>

<style scoped>
.side-nav {
  width: 260px;
  padding: 16px 12px;
  box-sizing: border-box;
  border-right: 1px solid var(--color-border-light);
  height: 100vh;
  overflow: hidden;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 18px;
  text-decoration: none;
  color: var(--color-text-primary);
}
.brand-icon { font-size: 18px; }

.menu { margin-top: 20px; display: flex; flex-direction: column; gap: 6px; }
.menu-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px;
  color: var(--color-text-primary); text-decoration: none; font-weight: 500;
}
.menu-item:hover { background: var(--color-bg-secondary); }
.menu-item.active { background: var(--color-primary-50); color: var(--color-primary); }
.icon { width: 18px; text-align: center; }

.more { margin-top: 16px; }
.more-title { padding: 8px 12px; color: var(--color-text-tertiary); font-size: 12px; }
.more-item { display:block; padding: 8px 12px; color: var(--color-text-secondary); text-decoration:none; border-radius: 8px; }
.more-item:hover { background: var(--color-bg-secondary); color: var(--color-text-primary); }

.user { position: absolute; left: 12px; right: 12px; bottom: 12px; display:flex; align-items:center; gap:8px; padding: 10px; border-top: 1px solid var(--color-border-light); }
.avatar { width: 28px; height: 28px; border-radius: 50%; display:flex; align-items:center; justify-content:center; background: var(--color-bg-secondary); }
.user-name { color: var(--color-text-secondary); font-size: 14px; }
</style>


