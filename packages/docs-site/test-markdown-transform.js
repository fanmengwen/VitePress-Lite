#!/usr/bin/env node

// 测试 markdown transformer 插件
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import markdownTransformerPlugin from './plugins/markdown-transformer-plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建插件实例
const plugin = markdownTransformerPlugin();

// 读取问题文件
const problemFile = path.join(__dirname, '../../docs/01-getting-started/unit2.md');
const fileContent = fs.readFileSync(problemFile, 'utf-8');

console.log('=== 原始文件内容 ===');
console.log(fileContent.substring(0, 200) + '...');

// 测试转换
try {
  const result = plugin.transform(fileContent, problemFile);
  console.log('\n=== 转换结果 ===');
  console.log('结果类型:', typeof result);
  console.log('结果:', result);
  
  if (result && typeof result === 'string') {
    console.log('\n✅ 转换成功');
    console.log('前500字符:', result.substring(0, 500));
  } else if (result === null) {
    console.log('❌ 转换返回null，可能文件不是markdown');
  } else {
    console.log('❌ 转换返回了意外的类型');
  }
} catch (error) {
  console.log('\n❌ 转换失败:');
  console.error(error.message);
  console.error(error.stack);
}
