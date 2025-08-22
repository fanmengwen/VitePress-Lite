// plugins/virtual-pages-plugin.js
import glob from "fast-glob";
import { readFileSync } from "fs";
import matter from "gray-matter";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 加载侧边栏配置文件
 * @returns {Promise<Object>} 配置对象，加载失败时返回默认配置
 */
async function loadSidebarConfig() {
  try {
    // 动态导入配置文件（ES模块方式）
    const configPath = join(__dirname, "../sidebar.config.js");
    const configModule = await import(configPath + "?t=" + Date.now()); // 添加时间戳避免缓存
    return configModule.default || {};
  } catch (error) {
    console.warn(
      "Failed to load sidebar.config.js, using default configuration:",
      error.message
    );
    return {
      directoryTitles: {},
      fileTitles: {},
      sortRules: { order: [] },
      displayOptions: { hidden: [] },
    };
  }
}

/**
 * 根据配置获取目录或文件的显示标题
 * @param {string} path - 文件或目录路径
 * @param {string} originalTitle - 原始标题（来自文件名或frontmatter）
 * @param {Object} config - 侧边栏配置
 * @param {boolean} isDirectory - 是否为目录
 * @returns {string} 映射后的标题
 */
function getMappedTitle(path, originalTitle, config, isDirectory = false) {
  // 移除docs/前缀和.md后缀，标准化路径
  const normalizedPath = path.replace(/^.*\/docs\//, "").replace(/\.md$/, "");

  // 优先级：文件标题映射 > 目录标题映射 > frontmatter标题 > 文件名
  if (!isDirectory && config.fileTitles?.[normalizedPath]) {
    return config.fileTitles[normalizedPath];
  }

  if (isDirectory && config.directoryTitles?.[normalizedPath]) {
    return config.directoryTitles[normalizedPath];
  }

  return originalTitle;
}

/**
 * 检查路径是否应该被隐藏
 * @param {string} path - 文件或目录路径
 * @param {Object} config - 侧边栏配置
 * @returns {boolean} 是否隐藏
 */
function shouldHidePath(path, config) {
  const normalizedPath = path.replace(/^.*\/docs\//, "").replace(/\.md$/, "");
  const hidden = config.displayOptions?.hidden || [];

  return hidden.some((hiddenPath) => {
    // 支持精确匹配和前缀匹配
    return (
      normalizedPath === hiddenPath ||
      normalizedPath.startsWith(hiddenPath + "/")
    );
  });
}

/**
 * 根据配置对路由进行排序
 * @param {Array} routes - 路由数组
 * @param {Object} config - 侧边栏配置
 * @param {string} parentPath - 父路径，用于获取对应的排序规则
 * @returns {Array} 排序后的路由数组
 */
function sortRoutesByConfig(routes, config, parentPath = "") {
  if (!config.sortRules) return routes;

  // 获取排序规则
  let sortOrder = [];
  if (parentPath === "") {
    // 根级别排序
    sortOrder = config.sortRules.order || [];
  } else {
    // 子目录排序
    const parentKey = parentPath.replace(/^\//, "").replace(/\/$/, "");
    sortOrder = config.sortRules[parentKey] || [];
  }

  if (sortOrder.length === 0) return routes;

  // 按配置顺序排序
  return routes.sort((a, b) => {
    const aKey = a.path.split("/").pop();
    const bKey = b.path.split("/").pop();

    const aIndex = sortOrder.indexOf(aKey);
    const bIndex = sortOrder.indexOf(bKey);

    // 如果都在排序规则中，按规则排序
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // 在排序规则中的排在前面
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // 都不在排序规则中，保持字母顺序
    return aKey.localeCompare(bKey);
  });
}

function pathToRoutePath(path) {
  // 传入的 path 例子: '../../../docs/guide/installation.md'
  const routePath = path
    .replace(/^.*\/docs\//, "") // -> 'guide/installation.md'
    .replace(/\.md$/, "") // -> 'guide/installation'
    .replace(/index$/, "") // 对于 'guide/installation' -> 不变
    // 对于 'guide/index' -> 'guide/'
    .replace(/\/$/, ""); // 对于 'guide/' -> 'guide'

  return `/${routePath}`.replace(/\/$/, "/");
}

/**
 * 构建路由树：从扁平的文件路径列表构建嵌套的树形结构
 * @param {string[]} pages - 文件路径数组
 * @param {Object} config - 侧边栏配置对象
 * @returns {Object} 路由树对象
 */
function buildRouteTree(pages, config) {
  const tree = {};

  // 过滤隐藏的文件
  const visiblePages = pages.filter((page) => !shouldHidePath(page, config));

  visiblePages.forEach((page) => {
    // 移除 docs/ 前缀并分割路径
    const pathWithoutDocs = page.replace(/^.*\/docs\//, "");
    const pathSegments = pathWithoutDocs.split("/");

    // 读取文件内容并解析标题
    let title = pathWithoutDocs.replace(/\.md$/, "");
    try {
      const fileContent = readFileSync(page, "utf-8");
      const { data } = matter(fileContent);
      if (data.title) {
        title = data.title;
      }
    } catch (error) {
      console.warn(`Failed to read title from ${page}:`, error.message);
    }

    // 应用配置文件的标题映射
    const mappedTitle = getMappedTitle(page, title, config, false);

    // 构建路由信息
    const routeData = {
      path: pathToRoutePath(page),
      title: mappedTitle,
      component: `() => import('/${page}')`,
      isFile: true,
    };

    // 逐级构建树结构
    let currentNode = tree;

    // 处理除了最后一个段（文件名）之外的所有路径段
    for (let i = 0; i < pathSegments.length - 1; i++) {
      const segment = pathSegments[i];

      if (!currentNode[segment]) {
        // 构建目录路径用于标题映射
        const directoryPath = `docs/${pathSegments.slice(0, i + 1).join("/")}`;
        const mappedDirectoryTitle = getMappedTitle(
          directoryPath,
          segment,
          config,
          true
        );

        currentNode[segment] = {
          isFile: false,
          children: {},
          title: mappedDirectoryTitle,
          path: `/${pathSegments.slice(0, i + 1).join("/")}`,
        };
      }
      currentNode = currentNode[segment].children;
    }

    // 处理文件名（去掉 .md 扩展名）
    const fileName = pathSegments[pathSegments.length - 1].replace(/\.md$/, "");
    currentNode[fileName] = routeData;
  });

  return tree;
}

/**
 * 递归转换路由树为 Vue Router 所需的嵌套数组格式
 * @param {Object} treeNode - 树节点
 * @param {Object} config - 侧边栏配置对象
 * @param {string} parentPath - 父路径
 * @returns {Array} 路由数组
 */
function convertTreeToNestedRoutes(treeNode, config, parentPath = "") {
  const routes = [];

  Object.keys(treeNode).forEach((key) => {
    const node = treeNode[key];

    if (node.isFile) {
      // 这是一个文件节点，直接创建路由
      routes.push({
        path: node.path,
        title: node.title,
        component: node.component,
      });
    } else {
      // 这是一个目录节点，需要递归处理其子节点
      const children = convertTreeToNestedRoutes(
        node.children,
        config,
        node.path
      );

      if (children.length > 0) {
        // 对子路由进行排序
        const sortedChildren = sortRoutesByConfig(children, config, node.path);

        routes.push({
          path: node.path,
          title: node.title,
          children: sortedChildren,
          // 目录本身可能需要一个默认组件或重定向
          redirect: sortedChildren[0]?.path,
        });
      }
    }
  });

  // 对当前级别的路由进行排序
  return sortRoutesByConfig(routes, config, parentPath);
}

export default function virtualPagesPlugin() {
  const virtualId = "virtual:pages";
  const resolvedVirtualId = "\0" + virtualId;

  return {
    name: "virtual-pages-plugin",

    // 解析虚拟页面
    resolveId(id) {
      if (id === virtualId) {
        return resolvedVirtualId;
      }
    },

    // 加载虚拟页面
    async load(id) {
      if (id === resolvedVirtualId) {
        try {
          // 1. 加载配置文件
          const config = await loadSidebarConfig();

          // 2. 扫描文件

          const pages = await glob("../../docs/**/*.md", { posix: true });

          // 3. 构建路由树（集成配置文件）
          const routeTree = buildRouteTree(pages, config);
          console.log("🚀 ~ load ~ routeTree:", routeTree);

          // 4. 转换为嵌套路由数组
          const routes = convertTreeToNestedRoutes(routeTree, config);

          // 5. 生成最终代码
          const routesCode = JSON.stringify(routes, null, 2).replace(
            /"component": "(\(\) => import\('.*?'\))"/g,
            '"component": $1'
          );

          return `export default ${routesCode}`;
        } catch (error) {
          console.error("Error in virtual-pages-plugin:", error);
          // 返回空路由数组，避免应用崩溃
          return "export default []";
        }
      }
    },

    // 监听配置文件变化，触发重新构建
    configureServer(server) {
      const configPath = join(__dirname, "../sidebar.config.js");
      server.watcher.add(configPath);

      server.watcher.on("change", (path) => {
        if (path === configPath) {
          console.log("Sidebar config changed, rebuilding virtual pages...");
          // 清除模块缓存
          const mod = server.moduleGraph.getModuleById(resolvedVirtualId);
          if (mod) {
            server.reloadModule(mod);
          }
        }
      });
    },
  };
}
