#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import markdownTransformerPlugin from './plugins/markdown-transformer-plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建插件实例并测试转换
const plugin = markdownTransformerPlugin();
const problemFile = path.join(__dirname, '../../docs/01-getting-started/unit2.md');
const fileContent = fs.readFileSync(problemFile, 'utf-8');

const result = plugin.transform(fileContent, problemFile);

if (result && result.code) {
  // 将生成的代码写入文件以便检查
  fs.writeFileSync('./generated-component.vue', result.code);
  console.log('✅ 生成的组件已保存到 generated-component.vue');
  
  // 基本的模板验证
  const templateMatch = result.code.match(/<template>([\s\S]*)<\/template>/);
  if (templateMatch) {
    const template = templateMatch[1];
    
    // 检查标签配对
    const openTags = template.match(/<[^/][^>]*>/g) || [];
    const closeTags = template.match(/<\/[^>]+>/g) || [];
    
    console.log(`\n📊 标签分析:`);
    console.log(`开始标签数量: ${openTags.length}`);
    console.log(`结束标签数量: ${closeTags.length}`);
    
    // 检查自闭合标签
    const selfClosingTags = template.match(/<[^>]+\/>/g) || [];
    console.log(`自闭合标签数量: ${selfClosingTags.length}`);
    
    // 简单检查是否有明显的不配对
    if (Math.abs(openTags.length - closeTags.length) > 2) {
      console.log('⚠️  可能存在标签不配对问题');
    }
  } else {
    console.log('❌ 未找到template部分');
  }
} else {
  console.log('❌ 转换失败');
}
