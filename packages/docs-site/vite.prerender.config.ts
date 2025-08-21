// vite.prerender.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { createHead } from '@unhead/vue'

// 预渲染专用配置
import { collectPrerenderRoutes } from "./scripts/collect-routes.js";
// 注意: vite-plugin-prerender 需要安装
// npm install --save-dev vite-plugin-prerender

export default defineConfig(async () => {
  // 收集需要预渲染的路由
  const routes = await collectPrerenderRoutes();
  
  return {
    plugins: [
      vue(),
      // 预渲染插件配置
      {
        name: 'vite-plugin-prerender',
        apply: 'build',
        async generateBundle() {
          // 这里可以集成实际的预渲染插件
          console.log('🎯 开始预渲染路由:', routes);
        }
      }
    ],
    
    build: {
      outDir: 'dist-prerender',
      
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        
        // 确保所有路由都能被正确处理
        external: [],
        
        output: {
          // 为每个路由生成对应的HTML文件
          manualChunks: undefined,
          
          // 优化资源文件命名
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/styles-[hash].css';
            }
            return 'assets/[name]-[hash][extname]';
          }
        }
      }
    },
    
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    
    // SSR 相关配置，用于预渲染
    ssr: {
      noExternal: ['@unhead/vue']
    }
  };
});

