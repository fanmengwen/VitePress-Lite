import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ViteMarkdown from "vite-plugin-md";

import virtualPagesPlugin from "./plugins/virtual-pages-plugin";
import markdownTransformerPlugin from "./plugins/markdown-transformer-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    markdownTransformerPlugin(),
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    // ViteMarkdown(),
    virtualPagesPlugin(),
    {
      name: "vite-moduleGraph",
      configureServer: (server) => {
        // console.log(server.moduleGraph);
      },
    },
  ],
});
