import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'

export interface SidebarItem {
  path: string
  title: string
  children?: SidebarItem[]
  isFile?: boolean
  level?: number
  isExpanded?: boolean
  isActive?: boolean
}

export interface SidebarState {
  items: SidebarItem[]
  isVisible: boolean
  isMobile: boolean
  activeItem: string | null
}

/**
 * 侧边栏管理组合式函数
 * 提供动态侧边栏数据、状态管理和移动端适配
 */
export function useSidebar() {
  const router = useRouter()
  const route = useRoute()

  // 响应式状态
  const state = ref<SidebarState>({
    items: [],
    isVisible: false,
    isMobile: false,
    activeItem: null
  })

  // 展开状态管理
  const expandedItems = ref<Set<string>>(new Set())

  // 计算属性
  const sidebarItems = computed(() => {
    // 直接从路由中获取嵌套的文档路由
    return buildSidebarFromVueRoutes(router.getRoutes(), route)
  })

  const isMobileView = computed(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false
  })

  // 方法
  const toggleSidebar = () => {
    state.value.isVisible = !state.value.isVisible
  }

  const closeSidebar = () => {
    state.value.isVisible = false
  }

  const openSidebar = () => {
    state.value.isVisible = true
  }

  const toggleItemExpansion = (path: string) => {
    if (expandedItems.value.has(path)) {
      expandedItems.value.delete(path)
    } else {
      expandedItems.value.add(path)
    }
  }

  const isItemExpanded = (path: string): boolean => {
    return expandedItems.value.has(path)
  }

  const isItemActive = (itemPath: string): boolean => {
    return route.path === itemPath || route.path.startsWith(itemPath + '/')
  }

  const isCurrentItem = (itemPath: string): boolean => {
    return route.path === itemPath
  }

  // 构建侧边栏数据（从虚拟页面插件的嵌套路由）
  const buildSidebarFromVueRoutes = (routes: any[], currentRoute: RouteLocationNormalized): SidebarItem[] => {
    console.log('🚀 Building sidebar from Vue routes:')
    console.log('📊 Total routes received:', routes.length)
    
    // 过滤出有 children 的路由（这些是虚拟页面插件生成的父级路由）
    const documentRoutes = routes.filter(route => {
      const hasValidChildren = route.children && route.children.length > 0 && (route.title || route.meta?.title)
      console.log(`Route ${route.path}:`, {
        title: route.title,
        metaTitle: route.meta?.title,
        hasChildren: !!route.children,
        childrenCount: route.children?.length || 0,
        isValid: hasValidChildren
      })
      return hasValidChildren
    })

    console.log(`📋 Found ${documentRoutes.length} document routes with children`)

    // 转换为侧边栏项
    const sidebarItems = documentRoutes.map(route => convertRouteToSidebarItem(route, 0))
    console.log('🎯 Generated sidebar items:', sidebarItems)
    
    // 如果没有找到路由，返回测试数据
    if (sidebarItems.length === 0) {
      console.log('⚠️ No sidebar items found, returning test data')
      return [
        {
          path: '/test',
          title: '测试目录',
          isFile: false,
          level: 0,
          isExpanded: false,
          isActive: false,
          children: [
            {
              path: '/test/item1',
              title: '测试文档1',
              isFile: true,
              level: 1,
              isExpanded: false,
              isActive: false
            }
          ]
        }
      ]
    }
    
    return sidebarItems
  }

  // 转换 Vue 路由为侧边栏项
  const convertRouteToSidebarItem = (route: any, level = 0): SidebarItem => {
    const item: SidebarItem = {
      path: route.path,
      title: route.title || route.meta?.title || route.path,
      isFile: !route.children || route.children.length === 0,
      level,
      isExpanded: isItemExpanded(route.path),
      isActive: isItemActive(route.path)
    }

    // 如果有子路由，递归处理
    if (route.children && route.children.length > 0) {
      item.children = route.children.map((child: any) => 
        convertRouteToSidebarItem(child, level + 1)
      )
      item.isFile = false
    }

    return item
  }

  // 构建侧边栏树形结构（备用函数）
  const buildSidebarTree = (routes: any[], currentRoute: RouteLocationNormalized): SidebarItem[] => {
    console.log('🚀 Building sidebar tree from routes:')
    console.log('📊 Total routes received:', routes.length)
    
    // 打印所有路由信息进行调试
    routes.forEach((route, index) => {
      console.log(`Route ${index}:`, {
        path: route.path,
        name: route.name,
        title: route.title,
        hidden: route.hidden,
        hasChildren: !!route.children,
        component: typeof route.component
      })
    })
    
    // 过滤出文档路由（排除首页和404页面）
    const documentRoutes = routes.filter(route => {
      const isValid = route.path !== '/' && 
             route.path !== '/:pathMatch(.*)*' && 
             !route.hidden &&
             route.title
      
      if (isValid) {
        console.log('✅ Valid document route:', route.path, route.title, 'has children:', !!route.children)
      } else {
        console.log('❌ Filtered out route:', {
          path: route.path,
          title: route.title,
          hidden: route.hidden,
          reason: !route.title ? 'No title' : route.path === '/' ? 'Homepage' : route.path === '/:pathMatch(.*)*' ? '404 route' : route.hidden ? 'Hidden' : 'Unknown'
        })
      }
      return isValid
    })

    console.log(`📋 Found ${documentRoutes.length} document routes out of ${routes.length} total`)

    // 递归转换虚拟页面插件的嵌套结构为侧边栏结构
    const convertRouteToSidebarItem = (route: any, level = 0): SidebarItem => {
      const item: SidebarItem = {
        path: route.path,
        title: route.title,
        isFile: !route.children || route.children.length === 0,
        level,
        isExpanded: isItemExpanded(route.path),
        isActive: isItemActive(route.path)
      }

      // 如果有子路由，递归处理
      if (route.children && route.children.length > 0) {
        console.log(`📁 Processing children for ${route.path}:`, route.children.length)
        item.children = route.children.map((child: any) => 
          convertRouteToSidebarItem(child, level + 1)
        )
        item.isFile = false
      }

      return item
    }

    // 转换所有文档路由
    const result = documentRoutes.map(route => convertRouteToSidebarItem(route))
    console.log('🎯 Final sidebar items:', result)
    return result
  }

  // 从路径获取默认标题
  const getDefaultTitle = (path: string): string => {
    const segments = path.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1]
    
    // 移除数字前缀和连字符，转换为标题格式
    return lastSegment
      .replace(/^\d+-/, '') // 移除数字前缀如 "01-"
      .replace(/-/g, ' ')   // 连字符转空格
      .replace(/\b\w/g, l => l.toUpperCase()) // 首字母大写
  }

  // 处理窗口大小变化
  const handleResize = () => {
    const mobile = window.innerWidth < 768
    state.value.isMobile = mobile
    
    // 移动端自动关闭侧边栏
    if (mobile && state.value.isVisible) {
      state.value.isVisible = false
    }
  }

  // 路由变化时的处理
  const handleRouteChange = () => {
    // 更新活跃状态
    state.value.activeItem = route.path
    
    // 移动端路由变化时关闭侧边栏
    if (state.value.isMobile) {
      closeSidebar()
    }

    // 自动展开当前路由的父级目录
    const pathSegments = route.path.split('/').filter(Boolean)
    for (let i = 1; i <= pathSegments.length; i++) {
      const parentPath = '/' + pathSegments.slice(0, i).join('/')
      expandedItems.value.add(parentPath)
    }
  }

  // 生命周期
  onMounted(() => {
    // 初始化移动端状态
    handleResize()
    window.addEventListener('resize', handleResize)

    // 初始化当前路由状态
    handleRouteChange()

    // 监听路由变化
    router.afterEach(handleRouteChange)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  })

  return {
    // 状态
    state: state.value,
    sidebarItems,
    isMobileView,
    expandedItems: expandedItems.value,

    // 方法
    toggleSidebar,
    closeSidebar,
    openSidebar,
    toggleItemExpansion,
    isItemExpanded,
    isItemActive,
    isCurrentItem,
    handleRouteChange
  }
}
