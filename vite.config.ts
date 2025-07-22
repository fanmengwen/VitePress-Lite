import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ViteMarkdown from "vite-plugin-md";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({ include: [/\.vue$/, /\.md$/] }),
    ViteMarkdown(),
    {
      name: "vite-moduleGraph",
      configureServer: (server) => {
        // console.log(server.moduleGraph);
      },
    },
  ],
});
