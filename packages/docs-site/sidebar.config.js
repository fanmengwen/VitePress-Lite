/**
 * 侧边栏配置文件 - 中心化文档结构定义
 * 用于将技术性目录名映射为用户友好的显示标题
 */

export default {
  // 目录标题映射
  directoryTitles: {
    // 根级别目录映射
    unit: "📚 核心单元",
  },

  // 文件标题映射 (可选，优先级高于frontmatter)
  fileTitles: {
    total: "📖 Vite 知识体系总览",
    "unit/unit1": "🎯 核心理念详解",
    "unit/unit2": "⚡ 与 Webpack 的差异分析",
    "unit/unit3": "🔥 HMR 热更新原理",
    hmr: "🔥 HMR 热更新原理",
    setting: "🔥 项目配置详解",
  },

  // 排序规则
  sortRules: {
    // 根级别排序
    order: ["total", "unit", "hmr", "setting"],

    // 子目录排序
    unit: ["unit1", "unit2", "unit3"],
  },

  // 显示选项
  displayOptions: {
    // 是否显示文件图标
    showFileIcons: true,

    // 是否显示目录图标
    showDirectoryIcons: true,

    // 默认展开的目录
    expandedByDefault: ["unit", "guide"],

    // 是否隐藏特定文件/目录
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
