#!/usr/bin/env python3
"""
向量匹配改进效果测试脚本
用于验证查询意图识别和结果过滤的准确性
"""

import json
import requests
import time
from typing import Dict, List, Any
from colorama import init, Fore, Style

# 初始化colorama用于彩色输出
init()

class VectorImprovementTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
    
    def test_single_query(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """测试单个查询用例"""
        print(f"\n{'='*60}")
        print(f"{Fore.CYAN}测试: {test_case['name']}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}查询: {test_case['query']}{Style.RESET_ALL}")
        print(f"预期意图: {test_case['expected_intent']}")
        
        # 发送API请求
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "question": test_case['query'],
                    "include_sources": True
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._analyze_response(test_case, data)
            else:
                return {
                    "name": test_case['name'],
                    "status": "ERROR",
                    "error": f"HTTP {response.status_code}: {response.text}",
                    "score": 0
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "name": test_case['name'],
                "status": "ERROR", 
                "error": str(e),
                "score": 0
            }
    
    def _analyze_response(self, test_case: Dict[str, Any], response_data: Dict[str, Any]) -> Dict[str, Any]:
        """分析响应结果"""
        sources = response_data.get('sources', [])
        
        # 检查应该包含的文档
        should_include = test_case.get('should_include', [])
        should_exclude = test_case.get('should_exclude', [])
        
        included_files = [source['file_path'] for source in sources]
        
        # 计算准确性得分
        include_score = 0
        exclude_score = 0
        
        # 检查应该包含的文档
        for should_file in should_include:
            if any(should_file in file_path for file_path in included_files):
                include_score += 1
                print(f"{Fore.GREEN}✓ 正确包含: {should_file}{Style.RESET_ALL}")
            else:
                print(f"{Fore.RED}✗ 缺失文档: {should_file}{Style.RESET_ALL}")
        
        # 检查应该排除的文档
        excluded_files = []
        for exclude_file in should_exclude:
            if any(exclude_file in file_path for file_path in included_files):
                excluded_files.append(exclude_file)
                print(f"{Fore.RED}✗ 错误包含: {exclude_file}{Style.RESET_ALL}")
            else:
                exclude_score += 1
                print(f"{Fore.GREEN}✓ 正确排除: {exclude_file}{Style.RESET_ALL}")
        
        # 计算总分
        total_checks = len(should_include) + len(should_exclude)
        correct_checks = include_score + exclude_score
        accuracy = correct_checks / total_checks if total_checks > 0 else 0
        
        # 显示返回的源文档
        print(f"\n{Fore.MAGENTA}返回的源文档:{Style.RESET_ALL}")
        for i, source in enumerate(sources[:3], 1):
            score = source.get('similarity_score', 0)
            print(f"  {i}. {source['file_path']} (相似度: {score:.3f})")
        
        result = {
            "name": test_case['name'],
            "query": test_case['query'],
            "status": "SUCCESS",
            "accuracy": accuracy,
            "score": int(accuracy * 100),
            "included_correct": include_score,
            "excluded_correct": exclude_score, 
            "total_sources": len(sources),
            "confidence_score": response_data.get('confidence_score', 0),
            "response_time_ms": response_data.get('response_time_ms', 0),
            "errors": excluded_files
        }
        
        # 显示测试结果
        status_color = Fore.GREEN if accuracy >= 0.8 else Fore.YELLOW if accuracy >= 0.6 else Fore.RED
        print(f"\n{status_color}准确率: {accuracy:.1%} ({correct_checks}/{total_checks}){Style.RESET_ALL}")
        print(f"置信度: {result['confidence_score']:.2f}")
        print(f"响应时间: {result['response_time_ms']}ms")
        
        return result
    
    def run_all_tests(self, test_file: str = "test_queries.json") -> None:
        """运行所有测试用例"""
        print(f"{Fore.CYAN}{'='*60}")
        print(f"  向量匹配改进效果测试")
        print(f"{'='*60}{Style.RESET_ALL}")
        
        # 加载测试用例
        try:
            with open(test_file, 'r', encoding='utf-8') as f:
                test_cases = json.load(f)
        except FileNotFoundError:
            print(f"{Fore.RED}错误: 找不到测试文件 {test_file}{Style.RESET_ALL}")
            return
        except json.JSONDecodeError:
            print(f"{Fore.RED}错误: 测试文件格式无效{Style.RESET_ALL}")
            return
        
        # 执行测试
        for test_case in test_cases:
            result = self.test_single_query(test_case)
            self.results.append(result)
            time.sleep(1)  # 避免请求过快
        
        # 生成测试报告
        self._generate_report()
    
    def _generate_report(self) -> None:
        """生成测试报告"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"  测试报告总结")
        print(f"{'='*60}{Style.RESET_ALL}")
        
        successful_tests = [r for r in self.results if r['status'] == 'SUCCESS']
        failed_tests = [r for r in self.results if r['status'] == 'ERROR']
        
        if successful_tests:
            avg_accuracy = sum(r['accuracy'] for r in successful_tests) / len(successful_tests)
            avg_confidence = sum(r['confidence_score'] for r in successful_tests) / len(successful_tests)
            avg_response_time = sum(r['response_time_ms'] for r in successful_tests) / len(successful_tests)
            
            print(f"✓ 成功测试: {len(successful_tests)}/{len(self.results)}")
            print(f"✓ 平均准确率: {avg_accuracy:.1%}")
            print(f"✓ 平均置信度: {avg_confidence:.2f}")
            print(f"✓ 平均响应时间: {avg_response_time:.0f}ms")
            
            # 详细结果
            print(f"\n{Fore.YELLOW}详细结果:{Style.RESET_ALL}")
            for result in successful_tests:
                status_icon = "🟢" if result['accuracy'] >= 0.8 else "🟡" if result['accuracy'] >= 0.6 else "🔴"
                print(f"  {status_icon} {result['name']}: {result['accuracy']:.1%}")
                if result['errors']:
                    print(f"    ⚠️  错误包含: {', '.join(result['errors'])}")
        
        if failed_tests:
            print(f"\n{Fore.RED}失败测试: {len(failed_tests)}{Style.RESET_ALL}")
            for result in failed_tests:
                print(f"  ❌ {result['name']}: {result['error']}")
        
        # 改进建议
        if successful_tests:
            low_accuracy_tests = [r for r in successful_tests if r['accuracy'] < 0.8]
            if low_accuracy_tests:
                print(f"\n{Fore.YELLOW}改进建议:{Style.RESET_ALL}")
                for result in low_accuracy_tests:
                    print(f"  📝 {result['name']} 准确率较低 ({result['accuracy']:.1%})")
                    print(f"     建议检查查询意图识别和评分权重")

def main():
    """主函数"""
    print("向量匹配改进测试工具")
    print("确保AI服务正在运行在 http://localhost:8000")
    
    tester = VectorImprovementTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
