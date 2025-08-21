// seo.config.js - SEO配置文件
export default {
  // 站点基本信息
  site: {
    name: "VitePress Lite",
    url: "https://your-domain.com", // 后续替换为实际域名
    description: "VitePress Lite - 轻量级文档站点",
    author: "VitePress Lite Team",
    language: "zh-CN",
  },

  // 站点地图配置
  sitemap: {
    // 站点地图文件名
    filename: "sitemap.xml",

    // 默认更新频率
    changefreq: "weekly",

    // 页面优先级配置
    priority: {
      home: "1.0",
      docs: "0.8",
      pages: "0.6",
    },

    // 排除的路径（正则表达式）
    exclude: [/\/test\//, /\/draft\//, /\/temp\//, /\.test\./],
  },

  // robots.txt配置
  robots: {
    // 允许的用户代理
    userAgents: ["*"],

    // 禁止访问的路径
    disallow: [
      "/tmp/",
      "/.git/",
      "/node_modules/",
      "/dist/",
      "/src/",
      "/api/auth/",
      "/api/admin/",
    ],

    // 爬取延迟（秒）
    crawlDelay: 1,
  },

  // Open Graph默认配置
  openGraph: {
    type: "website",
    siteName: "VitePress Lite",
    image: "/og-image.jpg", // 默认社交分享图片
    locale: "zh_CN",
  },

  // Twitter Card配置
  twitter: {
    card: "summary_large_image",
    site: "@yourtwitterhandle", // 可选：Twitter账号
  },

  // JSON-LD结构化数据默认配置
  jsonLD: {
    organization: {
      "@type": "Organization",
      name: "VitePress Lite",
      url: "https://your-domain.com",
      logo: "https://your-domain.com/logo.png",
    },
  },
};
