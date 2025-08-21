// src/composables/useSEO.ts
import { useHead } from '@unhead/vue'
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import seoConfig from '../../seo.config.js'

export interface SEOMetaData {
  title?: string
  description?: string
  keywords?: string
  author?: string
  date?: string
  image?: string
  url?: string
  type?: string
  category?: string
  tags?: string[]
  readingTime?: number
  wordCount?: number
}

/**
 * SEO头部管理组合式函数
 * 提供动态设置页面元信息的能力
 */
export function useSEO(meta: ComputedRef<SEOMetaData> | SEOMetaData) {
  const metaData = computed(() => {
    // 判断是否为 computed ref
    const data = 'value' in meta ? meta.value : meta
    
    // 合并默认配置和传入数据
    return {
      title: data.title || seoConfig.site.name,
      description: data.description || seoConfig.site.description,
      keywords: data.keywords || 'vite,vue,documentation',
      author: data.author || seoConfig.site.author,
      image: data.image || seoConfig.openGraph.image,
      url: data.url || seoConfig.site.url,
      type: data.type || 'article',
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
      
      // 语言相关
      { name: 'language', content: seoConfig.site.language },
      { 'http-equiv': 'Content-Language', content: seoConfig.site.language },

      // Open Graph 标签
      { property: 'og:title', content: metaData.value.title },
      { property: 'og:description', content: metaData.value.description },
      { property: 'og:type', content: metaData.value.type || seoConfig.openGraph.type },
      { property: 'og:site_name', content: seoConfig.openGraph.siteName },
      { property: 'og:locale', content: seoConfig.openGraph.locale },

      // Twitter Card 标签
      { name: 'twitter:card', content: seoConfig.twitter.card },
      { name: 'twitter:title', content: metaData.value.title },
      { name: 'twitter:description', content: metaData.value.description },
      
      // 技术SEO标签
      { name: 'robots', content: 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1' },
      { name: 'viewport', content: 'width=device-width,initial-scale=1.0' },
      { name: 'format-detection', content: 'telephone=no' },
      
      // 移动端优化
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },

      // 日期相关
      ...(metaData.value.date ? [
        { name: 'article:published_time', content: metaData.value.date },
        { property: 'og:updated_time', content: metaData.value.date },
        { name: 'article:modified_time', content: metaData.value.date }
      ] : []),

      // 图片相关
      ...(metaData.value.image ? [
        { property: 'og:image', content: metaData.value.image },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:image', content: metaData.value.image },
        { name: 'twitter:image:alt', content: metaData.value.title }
      ] : []),

      // URL相关
      ...(metaData.value.url ? [
        { property: 'og:url', content: metaData.value.url },
        { name: 'twitter:url', content: metaData.value.url }
      ] : []),
      
      // 分类和标签
      ...(metaData.value.category ? [
        { name: 'article:section', content: metaData.value.category }
      ] : []),
      
      ...(metaData.value.tags ? metaData.value.tags.map(tag => ({
        name: 'article:tag',
        content: tag
      })) : []),
      
      // 阅读时间
      ...(metaData.value.readingTime ? [
        { name: 'article:reading_time', content: metaData.value.readingTime.toString() }
      ] : []),
      
      // Twitter账号
      ...(seoConfig.twitter.site ? [
        { name: 'twitter:site', content: seoConfig.twitter.site },
        { name: 'twitter:creator', content: seoConfig.twitter.site }
      ] : [])
    ],

    // 结构化数据 (JSON-LD)
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': metaData.value.type === 'website' ? 'WebSite' : 'Article',
          headline: metaData.value.title,
          name: metaData.value.title,
          description: metaData.value.description,
          url: metaData.value.url,
          
          // 作者信息
          author: {
            '@type': 'Person',
            name: metaData.value.author
          },
          
          // 发布者信息
          publisher: {
            '@type': 'Organization',
            name: seoConfig.jsonLD.organization.name,
            url: seoConfig.jsonLD.organization.url,
            logo: {
              '@type': 'ImageObject',
              url: seoConfig.jsonLD.organization.logo
            }
          },
          
          // 主要实体
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': metaData.value.url
          },
          
          // 图片信息
          ...(metaData.value.image && {
            image: {
              '@type': 'ImageObject',
              url: metaData.value.image,
              width: 1200,
              height: 630
            }
          }),
          
          // 日期信息
          ...(metaData.value.date && {
            datePublished: metaData.value.date,
            dateModified: metaData.value.date
          }),
          
          // 文章特定属性
          ...(metaData.value.type === 'article' && {
            articleSection: metaData.value.category || 'Technology',
            keywords: metaData.value.keywords,
            wordCount: metaData.value.wordCount,
            timeRequired: metaData.value.readingTime ? `PT${metaData.value.readingTime}M` : undefined
          }),
          
          // 网站特定属性
          ...(metaData.value.type === 'website' && {
            url: seoConfig.site.url,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${seoConfig.site.url}/search?q={search_term_string}`,
              'query-input': 'required name=search_term_string'
            }
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
    image: frontmatter.image || frontmatter.cover,
    type: frontmatter.type || 'article',
    category: frontmatter.category,
    tags: frontmatter.tags,
    readingTime: frontmatter.readingTime,
    wordCount: frontmatter.wordCount
  }
}

/**
 * 计算文本阅读时间（分钟）
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  // 中文字符计算
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  // 英文单词计算
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').match(/\b\w+\b/g)?.length || 0
  
  // 中文按字符计算，英文按单词计算
  const totalWords = chineseChars + englishWords
  
  return Math.ceil(totalWords / wordsPerMinute)
}

/**
 * 计算文本字数
 */
export function calculateWordCount(text: string): number {
  // 中文字符数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  // 英文单词数
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').match(/\b\w+\b/g)?.length || 0
  
  return chineseChars + englishWords
}

