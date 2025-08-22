/**
 * 侧边栏配置文件 - 中心化文档结构定义
 * 用于将技术性目录名映射为用户友好的显示标题
 */

export default {
  // 目录标题映射
  directoryTitles: {
    // 根级别目录映射
    "docs/01-getting-started": "01 入门",
    "docs/02-core-concepts": "02 核心概念",
    "docs/03-configuration": "03 高级概念",
    "docs/04-seo-performance": "04 SEO 性能",
    "docs/05-version": "05 版本控制",
  },

  // 文件标题映射 (可选，优先级高于frontmatter)
  fileTitles: {},

  // 排序规则
  sortRules: {
    // 根级别排序
    order: [""],

    // 子目录排序
    unit: [""],
  },

  // 显示选项
  displayOptions: {
    hidden: ["drafts", "temp"],
  },

  // 元数据配置
  metadata: {
    // 配置文件版本
    version: "1.0.0",

    // 最后更新时间
    lastUpdated: "2025-01-26",

    // 配置说明
    description: "文档侧边栏结构配置文件，用于控制导航显示的标题和排序",
  },
};
