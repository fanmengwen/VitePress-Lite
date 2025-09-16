#!/usr/bin/env python3
"""
Service testing script for manual validation of AI service.
Tests API endpoints and validates functionality.
"""

import asyncio
import sys
import json
import time
from pathlib import Path
from typing import Dict, Any, List
import argparse
import aiohttp
from loguru import logger

# Add project to path for imports (from tests/ directory)
sys.path.insert(0, str(Path(__file__).parent.parent))


class ServiceTester:
    """Test runner for AI service validation."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.session: aiohttp.ClientSession = None
        
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    async def test_health_endpoint(self) -> Dict[str, Any]:
        """Test health check endpoint."""
        logger.info("Testing health endpoint...")
        
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    logger.success(f"✅ Health check passed: {data['status']}")
                    return {"success": True, "data": data}
                else:
                    logger.error(f"❌ Health check failed: HTTP {response.status}")
                    return {"success": False, "error": f"HTTP {response.status}"}
                    
        except Exception as e:
            logger.error(f"❌ Health check error: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_chat_endpoint(self, question: str) -> Dict[str, Any]:
        """Test chat endpoint with a question."""
        logger.info(f"Testing chat endpoint with question: '{question[:50]}...'")
        
        payload = {
            "question": question,
            "include_sources": True,
            "max_tokens": 500,
            "temperature": 0.1
        }
        
        try:
            start_time = time.time()
            async with self.session.post(
                f"{self.base_url}/api/chat",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    logger.success(f"✅ Chat response received in {response_time:.0f}ms")
                    logger.info(f"   Answer: {data['answer'][:100]}...")
                    logger.info(f"   Sources: {len(data.get('sources', []))}")
                    logger.info(f"   Confidence: {data.get('confidence_score', 'N/A')}")
                    return {"success": True, "data": data, "response_time": response_time}
                else:
                    error_data = await response.text()
                    logger.error(f"❌ Chat request failed: HTTP {response.status}")
                    logger.error(f"   Error: {error_data}")
                    return {"success": False, "error": f"HTTP {response.status}: {error_data}"}
                    
        except Exception as e:
            logger.error(f"❌ Chat request error: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_system_info_endpoint(self) -> Dict[str, Any]:
        """Test system info endpoint."""
        logger.info("Testing system info endpoint...")
        
        try:
            async with self.session.get(f"{self.base_url}/system-info") as response:
                if response.status == 200:
                    data = await response.json()
                    logger.success("✅ System info retrieved successfully")
                    logger.info(f"   Vector store docs: {data.get('vector_store', {}).get('total_documents', 'N/A')}")
                    logger.info(f"   LLM status: {data.get('llm_service', {}).get('status', 'N/A')}")
                    return {"success": True, "data": data}
                elif response.status == 401:
                    logger.warning("⚠️ System info requires API key (expected for security)")
                    return {"success": True, "data": {"message": "API key required"}}
                else:
                    error_data = await response.text()
                    logger.error(f"❌ System info failed: HTTP {response.status}")
                    return {"success": False, "error": f"HTTP {response.status}: {error_data}"}
                    
        except Exception as e:
            logger.error(f"❌ System info error: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_vector_store_stats(self) -> Dict[str, Any]:
        """Test vector store statistics endpoint."""
        logger.info("Testing vector store stats...")
        
        try:
            async with self.session.get(f"{self.base_url}/api/vector-store/stats") as response:
                if response.status == 200:
                    data = await response.json()
                    logger.success("✅ Vector store stats retrieved")
                    logger.info(f"   Total documents: {data.get('total_documents', 'N/A')}")
                    logger.info(f"   Collection name: {data.get('collection_name', 'N/A')}")
                    return {"success": True, "data": data}
                elif response.status == 401:
                    logger.warning("⚠️ Vector store stats requires API key")
                    return {"success": True, "data": {"message": "API key required"}}
                else:
                    error_data = await response.text()
                    logger.error(f"❌ Vector store stats failed: HTTP {response.status}")
                    return {"success": False, "error": f"HTTP {response.status}: {error_data}"}
                    
        except Exception as e:
            logger.error(f"❌ Vector store stats error: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_chat_conversation(self) -> Dict[str, Any]:
        """Test a multi-turn conversation."""
        logger.info("Testing multi-turn conversation...")
        
        conversation = [
            "What is Vite?",
            "How do I configure the development server?",
            "What about production builds?"
        ]
        
        results = []
        history = []
        
        for i, question in enumerate(conversation):
            logger.info(f"Turn {i + 1}: {question}")
            
            payload = {
                "question": question,
                "history": history,
                "include_sources": True
            }
            
            try:
                async with self.session.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        answer = data["answer"]
                        
                        # Add to history
                        history.extend([
                            {"role": "user", "content": question, "timestamp": "2025-01-01T12:00:00Z"},
                            {"role": "assistant", "content": answer, "timestamp": "2025-01-01T12:00:01Z"}
                        ])
                        
                        results.append({
                            "question": question,
                            "answer": answer[:100] + "...",
                            "sources": len(data.get("sources", []))
                        })
                        
                        logger.success(f"   ✅ Response: {answer[:50]}...")
                    else:
                        logger.error(f"   ❌ Failed: HTTP {response.status}")
                        results.append({"question": question, "error": f"HTTP {response.status}"})
                        
            except Exception as e:
                logger.error(f"   ❌ Error: {e}")
                results.append({"question": question, "error": str(e)})
        
        success_count = sum(1 for r in results if "error" not in r)
        logger.info(f"Conversation test: {success_count}/{len(conversation)} successful")
        
        return {
            "success": success_count == len(conversation),
            "results": results,
            "success_rate": success_count / len(conversation)
        }
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all service tests."""
        logger.info("🚀 Starting comprehensive service tests...")
        
        test_results = {}
        
        # Basic connectivity
        test_results["health"] = await self.test_health_endpoint()
        
        # Core functionality
        if test_results["health"]["success"]:
            test_results["chat_basic"] = await self.test_chat_endpoint(
                "What is Vite and why is it fast?"
            )
            
            test_results["chat_chinese"] = await self.test_chat_endpoint(
                "Vite 的热模块替换是如何工作的？"
            )
            
            test_results["conversation"] = await self.test_chat_conversation()
        
        # System endpoints
        test_results["system_info"] = await self.test_system_info_endpoint()
        test_results["vector_stats"] = await self.test_vector_store_stats()
        
        # Calculate overall success
        successful_tests = sum(1 for result in test_results.values() if result.get("success", False))
        total_tests = len(test_results)
        success_rate = successful_tests / total_tests if total_tests > 0 else 0
        
        logger.info("📊 Test Summary:")
        logger.info(f"   Tests passed: {successful_tests}/{total_tests}")
        logger.info(f"   Success rate: {success_rate:.1%}")
        
        if success_rate >= 0.8:
            logger.success("🎉 Service is functioning well!")
        elif success_rate >= 0.5:
            logger.warning("⚠️ Service has some issues but core functionality works")
        else:
            logger.error("❌ Service has significant issues")
        
        return {
            "overall_success": success_rate >= 0.8,
            "success_rate": success_rate,
            "results": test_results
        }


async def main():
    """Main CLI interface for service testing."""
    parser = argparse.ArgumentParser(description="Test AI service endpoints")
    
    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:8000",
        help="Base URL of the AI service"
    )
    
    parser.add_argument(
        "--test",
        choices=["health", "chat", "conversation", "all"],
        default="all",
        help="Which test to run"
    )
    
    parser.add_argument(
        "--question",
        type=str,
        default="What is Vite and how does it work?",
        help="Question to test with (for chat test)"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    parser.add_argument(
        "--output",
        type=str,
        help="Save test results to JSON file"
    )
    
    args = parser.parse_args()
    
    # Configure logging
    log_level = "DEBUG" if args.verbose else "INFO"
    logger.remove()
    logger.add(
        sys.stdout,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        level=log_level,
        colorize=True
    )
    
    async with ServiceTester(args.url) as tester:
        try:
            if args.test == "health":
                result = await tester.test_health_endpoint()
            elif args.test == "chat":
                result = await tester.test_chat_endpoint(args.question)
            elif args.test == "conversation":
                result = await tester.test_chat_conversation()
            else:  # all
                result = await tester.run_all_tests()
            
            # Save results if requested
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(result, f, indent=2, default=str)
                logger.info(f"💾 Results saved to {args.output}")
            
            # Exit with appropriate code
            if result.get("success", False) or result.get("overall_success", False):
                logger.success("🎉 All tests completed successfully!")
                sys.exit(0)
            else:
                logger.error("❌ Some tests failed")
                sys.exit(1)
                
        except KeyboardInterrupt:
            logger.warning("❌ Testing cancelled by user")
            sys.exit(1)
        except Exception as e:
            logger.error(f"❌ Testing failed: {e}")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main()) 
