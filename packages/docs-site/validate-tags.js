#!/usr/bin/env node

import fs from 'fs';

// 读取生成的组件
const content = fs.readFileSync('./generated-component.vue', 'utf-8');
const templateMatch = content.match(/<template>([\s\S]*)<\/template>/);

if (templateMatch) {
  const template = templateMatch[1];
  const lines = template.split('\n');
  
  console.log('🔍 逐行检查模板标签:');
  
  let openStack = [];
  let lineNum = 0;
  
  lines.forEach(line => {
    lineNum++;
    
    // 查找所有标签
    const tagMatches = line.match(/<[^>]+>/g);
    if (tagMatches) {
      tagMatches.forEach(tag => {
        if (tag.includes('<!--')) {
          // 注释，跳过
          return;
        }
        
        if (tag.endsWith('/>')) {
          // 自闭合标签
          console.log(`${lineNum.toString().padStart(3)}: ${tag} (自闭合)`);
        } else if (tag.startsWith('</')) {
          // 闭合标签
          const tagName = tag.match(/<\/([^>]+)>/)[1];
          const lastOpen = openStack.pop();
          if (lastOpen !== tagName) {
            console.log(`${lineNum.toString().padStart(3)}: ❌ ${tag} (期望: </${lastOpen}>, 实际: </${tagName}>)`);
          } else {
            console.log(`${lineNum.toString().padStart(3)}: ✅ ${tag}`);
          }
        } else {
          // 开放标签
          const tagName = tag.match(/<([^\s>]+)/)[1];
          openStack.push(tagName);
          console.log(`${lineNum.toString().padStart(3)}: ${tag} (开放)`);
        }
      });
    }
  });
  
  console.log('\n📋 未关闭的标签:');
  openStack.forEach(tag => {
    console.log(`❌ <${tag}>`);
  });
  
  if (openStack.length === 0) {
    console.log('✅ 所有标签都已正确关闭');
  }
}
