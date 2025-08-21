#!/bin/bash

# scripts/test-api-silence.sh
# 测试预渲染站点是否仍然尝试访问API端点

echo "🔍 测试API端点访问情况..."
echo

BASE_URL="http://localhost:4173"
ROUTES=("/" "/total" "/hmr" "/setting")

echo "📊 测试结果:"
echo "=============================================="

# 测试页面是否正常加载
for route in "${ROUTES[@]}"; do
    url="${BASE_URL}${route}"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "200" ]; then
        echo "✅ $route - HTTP $status"
    else
        echo "❌ $route - HTTP $status"
    fi
done

echo

# 测试API端点是否返回降级响应（期望200）
API_ENDPOINTS=("/health" "/api/posts")

echo "🔗 API端点降级测试 (期望200):"
echo "=============================================="

for endpoint in "${API_ENDPOINTS[@]}"; do
    url="${BASE_URL}${endpoint}"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "200" ]; then
        echo "✅ $endpoint - HTTP $status (降级响应正常)"
    else
        echo "❌ $endpoint - HTTP $status (降级失败)"
    fi
done

echo
echo "📝 说明:"
echo "- 页面路由应返回200 (正常页面内容)"
echo "- API端点现在返回200 (友好的降级响应，而不是404错误)"
echo "- Vue应用检测到静态环境，会跳过API请求"
echo "- 直接访问API端点会看到降级响应说明"

echo
echo "🌐 请在浏览器中打开以下地址检查："
echo "   页面: $BASE_URL (应该看到：📄 static环境检测到，跳过API请求)"
echo "   API: $BASE_URL/health (应该看到降级响应页面)"
