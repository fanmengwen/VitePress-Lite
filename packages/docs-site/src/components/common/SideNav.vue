<template>
  <aside class="side-nav">
    <div class="brand">
      <router-link to="/" class="brand-link">
        <span class="brand-icon">🧠</span>
        <span class="brand-text">知乎直答</span>
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
      <router-link to="/favorites" class="menu-item" active-class="active">
        <span class="icon">⭐</span>
        <span>收藏</span>
      </router-link>
      <router-link to="/history" class="menu-item" active-class="active">
        <span class="icon">🕘</span>
        <span>历史</span>
      </router-link>
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


