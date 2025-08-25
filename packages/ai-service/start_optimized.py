#!/usr/bin/env python3
"""
优化的AI服务启动脚本
自动应用性能优化配置并启动服务
"""

import os
import sys
import subprocess
from pathlib import Path

def set_performance_env():
    """设置性能优化环境变量"""
    optimizations = {
        'RETRIEVAL_TOP_K': '3',
        'SIMILARITY_THRESHOLD': '0.3', 
        'OPENAI_MAX_TOKENS': '500',
        'CHUNK_SIZE': '1000',
        'CHUNK_OVERLAP': '200',
        'OPENAI_TEMPERATURE': '0.1',
        'CACHE_TTL': '1800',
        'MAX_CONCURRENT_REQUESTS': '5',
        'PYTHONPATH': '.'
    }
    
    for key, value in optimizations.items():
        os.environ[key] = value
    
    print("🚀 AI服务性能优化配置:")
    print("   ✅ 检索文档数量: 3 (减少延迟)")
    print("   ✅ 相似度阈值: 0.3 (平衡相关性)")  
    print("   ✅ 最大Token数: 500 (加快生成)")
    print("   ✅ 文档块大小: 800 (优化处理)")
    print("   ✅ 缓存时间: 30分钟")
    print()

def main():
    """启动优化的AI服务"""
    print("🤖 启动AI服务 (性能优化版)")
    print("=" * 50)
    
    # 设置性能环境变量
    set_performance_env()
    
    # 启动服务
    try:
        print("🌟 正在启动服务...")
        subprocess.run([
            sys.executable, 
            "src/main.py"
        ], check=True)
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
    except subprocess.CalledProcessError as e:
        print(f"❌ 启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 