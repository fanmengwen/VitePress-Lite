// src/composables/useSEO.ts
import { useHead } from '@unhead/vue'
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'

export interface SEOMetaData {
  title?: string
  description?: string
  keywords?: string
  author?: string
  date?: string
  image?: string
  url?: string
}

/**
 * SEO头部管理组合式函数
 * 提供动态设置页面元信息的能力
 */
export function useSEO(meta: ComputedRef<SEOMetaData> | SEOMetaData) {
  const metaData = computed(() => {
    // 判断是否为 computed ref
    const data = 'value' in meta ? meta.value : meta
    return {
      title: data.title || 'VitePress Lite',
      description: data.description || 'VitePress Lite - 轻量级文档站点',
      keywords: data.keywords || 'vite,vue,documentation',
      author: data.author || 'VitePress Lite',
      ...data
    }
  })

  // 使用 @unhead/vue 管理头部信息
  useHead(() => ({
    title: metaData.value.title,
    meta: [
      // 基础SEO标签
      { name: 'description', content: metaData.value.description },
      { name: 'keywords', content: metaData.value.keywords },
      { name: 'author', content: metaData.value.author },

      // Open Graph 标签
      { property: 'og:title', content: metaData.value.title },
      { property: 'og:description', content: metaData.value.description },
      { property: 'og:type', content: 'article' },
      { property: 'og:site_name', content: 'VitePress Lite' },

      // Twitter Card 标签
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: metaData.value.title },
      { name: 'twitter:description', content: metaData.value.description },

      // 额外的SEO标签
      { name: 'robots', content: 'index,follow' },
      { name: 'viewport', content: 'width=device-width,initial-scale=1.0' },

      // 日期相关
      ...(metaData.value.date ? [
        { name: 'article:published_time', content: metaData.value.date },
        { property: 'og:updated_time', content: metaData.value.date }
      ] : []),

      // 图片相关
      ...(metaData.value.image ? [
        { property: 'og:image', content: metaData.value.image },
        { name: 'twitter:image', content: metaData.value.image }
      ] : []),

      // URL相关
      ...(metaData.value.url ? [
        { property: 'og:url', content: metaData.value.url }
      ] : [])
    ],

    // 结构化数据 (JSON-LD)
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: metaData.value.title,
          description: metaData.value.description,
          author: {
            '@type': 'Person',
            name: metaData.value.author
          },
          publisher: {
            '@type': 'Organization',
            name: 'VitePress Lite'
          },
          ...(metaData.value.date && {
            datePublished: metaData.value.date,
            dateModified: metaData.value.date
          })
        })
      }
    ]
  }))

  return {
    metaData
  }
}

/**
 * 从Markdown frontmatter提取SEO数据
 */
export function extractSEOFromFrontmatter(frontmatter: Record<string, any>): SEOMetaData {
  return {
    title: frontmatter.title,
    description: frontmatter.description || frontmatter.summary,
    keywords: Array.isArray(frontmatter.tags) ? frontmatter.tags.join(',') : frontmatter.keywords,
    author: frontmatter.author,
    date: frontmatter.date,
    image: frontmatter.image || frontmatter.cover
  }
}

