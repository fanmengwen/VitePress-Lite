"""
Performance optimization configuration for AI service.
Import this file to apply optimized settings for faster response times.
"""

import os

# 设置环境变量来优化性能
def apply_performance_optimizations():
    """应用性能优化配置"""
    
    # 减少检索数量以提高速度
    os.environ['RETRIEVAL_TOP_K'] = '3'  # 从默认5减少到3
    
    # 调整相似度阈值，平衡相关性和检索数量
    os.environ['SIMILARITY_THRESHOLD'] = '0.3'  # 从0.5降低到0.3，确保能检索到文档
    
    # 减少生成的最大token数
    os.environ['OPENAI_MAX_TOKENS'] = '500'  # 从1000减少到500
    
    # 优化文档处理
    os.environ['CHUNK_SIZE'] = '800'  # 从1000减少到800
    os.environ['CHUNK_OVERLAP'] = '100'  # 从200减少到100
    
    # 提高温度稍微以获得更快的响应
    os.environ['OPENAI_TEMPERATURE'] = '0.1'
    
    # 缓存设置
    os.environ['CACHE_TTL'] = '1800'  # 30分钟缓存
    
    # 并发限制
    os.environ['MAX_CONCURRENT_REQUESTS'] = '5'
    
    print("✅ 性能优化配置已应用:")
    print(f"   • 检索文档数量: {os.environ.get('RETRIEVAL_TOP_K')}")
    print(f"   • 相似度阈值: {os.environ.get('SIMILARITY_THRESHOLD')}")
    print(f"   • 最大token数: {os.environ.get('OPENAI_MAX_TOKENS')}")
    print(f"   • 文档块大小: {os.environ.get('CHUNK_SIZE')}")

# 在模块导入时自动应用优化
if __name__ == "__main__":
    apply_performance_optimizations()
else:
    # 当作为模块导入时也应用优化
    apply_performance_optimizations() 