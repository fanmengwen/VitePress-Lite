import compression from "compression";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "dist");

const app = express();
const port = process.env.PORT || 4173;
const aiServiceUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";

app.use(compression());

const proxyFactory = (prefix) =>
  createProxyMiddleware({
    target: aiServiceUrl,
    changeOrigin: true,
    ws: true,
    proxyTimeout: 60000,
    pathRewrite: (path) => {
      if (path === "/") {
        return prefix;
      }
      return `${prefix}${path}`;
    },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader("X-Forwarded-Host", req.headers.host || "docs-site");
    },
  });

app.use("/api", proxyFactory("/api"));
app.use("/vector-store", proxyFactory("/vector-store"));
app.use("/health", proxyFactory("/health"));
app.use("/system-info", proxyFactory("/system-info"));

app.use(express.static(distDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Docs site listening on port ${port}, proxying AI at ${aiServiceUrl}`);
});
