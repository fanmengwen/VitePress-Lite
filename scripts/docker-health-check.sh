#!/bin/bash

# VitePress-Lite Docker 健康检查脚本
# 用于验证所有 Docker 服务是否正常运行

set -e

echo "🐳 开始检查 VitePress-Lite Docker 服务..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 和 Docker Compose 已安装${NC}"
}

# 检查环境变量
check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  .env 文件不存在，请复制 production.env.example 并配置${NC}"
        return 1
    fi
    
    source .env
    
    if [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${RED}❌ OPENAI_API_KEY 未配置${NC}"
        return 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        echo -e "${RED}❌ JWT_SECRET 未配置${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 环境变量配置正确${NC}"
}

# 检查服务状态
check_services() {
    echo "📋 检查服务状态..."
    
    # 检查容器是否运行
    services=("vitepress-lite-postgres" "vitepress-lite-api" "vitepress-lite-ai" "vitepress-lite-docs")
    
    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            echo -e "${GREEN}✅ $service 正在运行${NC}"
        else
            echo -e "${RED}❌ $service 未运行${NC}"
            return 1
        fi
    done
}

# 检查服务健康状态
check_health() {
    echo "🔍 检查服务健康状态..."
    
    # 等待服务启动
    echo "等待服务启动..."
    sleep 10
    
    # 检查数据库
    if docker-compose exec -T postgres pg_isready -U postgres -d vitepress_lite &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL 数据库健康${NC}"
    else
        echo -e "${RED}❌ PostgreSQL 数据库连接失败${NC}"
        return 1
    fi
    
    # 检查 API 服务器
    if curl -f http://localhost:3001/health &> /dev/null; then
        echo -e "${GREEN}✅ API 服务器健康${NC}"
    else
        echo -e "${RED}❌ API 服务器健康检查失败${NC}"
        return 1
    fi
    
    # 检查 AI 服务
    if curl -f http://localhost:8000/health &> /dev/null; then
        echo -e "${GREEN}✅ AI 服务健康${NC}"
    else
        echo -e "${RED}❌ AI 服务健康检查失败${NC}"
        return 1
    fi
    
    # 检查文档站点
    if curl -f http://localhost:4173/health &> /dev/null; then
        echo -e "${GREEN}✅ 文档站点健康${NC}"
    else
        echo -e "${RED}❌ 文档站点健康检查失败${NC}"
        return 1
    fi
}

# 显示服务信息
show_services_info() {
    echo ""
    echo "🌐 服务访问地址："
    echo "   📄 文档站点: http://localhost:4173"
    echo "   ⚡ API 服务: http://localhost:3001"
    echo "   🤖 AI 服务: http://localhost:8000"
    echo "   🗄️ 数据库管理: http://localhost:8080"
    echo ""
    echo "📊 查看服务状态: pnpm docker:ps"
    echo "📋 查看日志: pnpm docker:logs"
    echo ""
}

# 主函数
main() {
    echo "🚀 VitePress-Lite Docker 健康检查"
    echo "=================================="
    
    check_docker
    
    if ! check_env; then
        echo -e "${YELLOW}⚠️  请配置环境变量后重试${NC}"
        exit 1
    fi
    
    if ! check_services; then
        echo -e "${YELLOW}⚠️  请先启动服务: pnpm docker:up${NC}"
        exit 1
    fi
    
    if ! check_health; then
        echo -e "${RED}❌ 健康检查失败，请查看日志: pnpm docker:logs${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}🎉 所有服务运行正常！${NC}"
    show_services_info
}

# 运行主函数
main
