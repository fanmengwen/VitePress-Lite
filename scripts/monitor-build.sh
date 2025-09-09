#!/bin/bash

# Docker 构建监控脚本
# 帮助用户了解构建进度和时间估算

set -e

echo "🔍 Docker 构建监控开始..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 记录开始时间
START_TIME=$(date +%s)

echo -e "${BLUE}📊 构建时间预估：${NC}"
echo "   📄 docs-site: ~2-3 分钟"
echo "   ⚡ api-server: ~3-5 分钟" 
echo "   🤖 ai-service: ~8-15 分钟 (首次构建)"
echo "   🗄️ postgres: ~1 分钟"
echo ""

# 监控函数
monitor_build() {
    echo -e "${YELLOW}🔄 开始构建监控...${NC}"
    
    while true; do
        # 检查构建进程
        BUILD_PROCESSES=$(docker ps -a --filter "status=running" --filter "ancestor=*" --format "table {{.Names}}\t{{.Status}}" | grep -v "NAMES" | wc -l)
        
        # 检查已完成的镜像
        IMAGES_COUNT=$(docker images | grep vitepress-lite | wc -l)
        
        # 计算运行时间
        CURRENT_TIME=$(date +%s)
        ELAPSED=$((CURRENT_TIME - START_TIME))
        MINUTES=$((ELAPSED / 60))
        SECONDS=$((ELAPSED % 60))
        
        echo -e "${BLUE}⏱️  运行时间: ${MINUTES}m ${SECONDS}s | 完成镜像: ${IMAGES_COUNT}/4${NC}"
        
        # 显示当前构建状态
        echo "📊 当前镜像状态:"
        docker images | grep -E "(vitepress-lite|REPOSITORY)" | head -5
        
        # 检查是否完成
        if [ "$IMAGES_COUNT" -ge 4 ]; then
            echo -e "${GREEN}✅ 所有镜像构建完成！${NC}"
            break
        fi
        
        # 每30秒更新一次
        sleep 30
        clear
        echo "🔍 Docker 构建监控中..."
        echo "按 Ctrl+C 退出监控 (不会停止构建)"
        echo ""
    done
}

# 显示构建技巧
show_tips() {
    echo ""
    echo -e "${YELLOW}💡 构建优化技巧：${NC}"
    echo "   1. 确保网络连接稳定"
    echo "   2. 关闭不必要的应用释放内存"
    echo "   3. 后续构建会更快 (Docker 缓存)"
    echo "   4. 可以并行运行其他任务"
    echo ""
}

# 主函数
main() {
    show_tips
    
    # 捕获 Ctrl+C
    trap 'echo -e "\n${YELLOW}监控已停止，构建仍在后台继续...${NC}"; exit 0' INT
    
    monitor_build
    
    # 最终统计
    FINAL_TIME=$(date +%s)
    TOTAL_ELAPSED=$((FINAL_TIME - START_TIME))
    TOTAL_MINUTES=$((TOTAL_ELAPSED / 60))
    TOTAL_SECONDS=$((TOTAL_ELAPSED % 60))
    
    echo ""
    echo -e "${GREEN}🎉 构建监控完成！${NC}"
    echo -e "${BLUE}📊 总耗时: ${TOTAL_MINUTES}m ${TOTAL_SECONDS}s${NC}"
    echo ""
    echo "🚀 现在可以启动服务："
    echo "   pnpm docker:up"
    echo "   pnpm docker:health"
}

# 运行主函数
main
