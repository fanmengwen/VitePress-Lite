#!/usr/bin/env node

/**
 * AI Integration Test Script
 * Tests the AI service endpoints and validates the integration
 * Run with: node test-ai-integration.js
 */

import axios from "axios";

// Configuration
const AI_SERVICE_URL = "http://localhost:8000";
const FRONTEND_DEV_URL = "http://localhost:5173";

// ANSI colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function log(message, color = "white") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  log("\n" + "=".repeat(60), "cyan");
  log(`  ${title}`, "cyan");
  log("=".repeat(60), "cyan");
}

function logTest(testName) {
  log(`\n🧪 ${testName}`, "blue");
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

// Test functions
async function testAIServiceHealth() {
  logTest("Testing AI Service Health Check");

  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, {
      timeout: 5000,
    });

    if (response.status === 200 && response.data.status === "healthy") {
      logSuccess(`AI service is healthy - Version: ${response.data.version}`);
      logSuccess(`Documents indexed: ${response.data.documents_indexed}`);
      logSuccess(`Vector DB status: ${response.data.vector_db_status}`);
      logSuccess(`LLM status: ${response.data.llm_status}`);
      return true;
    } else {
      logError(
        `AI service returned unexpected status: ${response.data.status}`
      );
      return false;
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      logError("AI service is not running on port 8000");
      logWarning(
        "Please start the AI service with: cd packages/ai-service && poetry run python src/main.py"
      );
    } else {
      logError(`Health check failed: ${error.message}`);
    }
    return false;
  }
}

async function testAIChatEndpoint() {
  logTest("Testing AI Chat Endpoint");

  try {
    const testQuestion = "什么是 Vite？";
    const startTime = Date.now();

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/chat`,
      {
        question: testQuestion,
        include_sources: true,
        temperature: 0.1,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    if (response.status === 200 && response.data.answer) {
      logSuccess("Chat endpoint responded successfully");
      logSuccess(`Question: ${testQuestion}`);
      logSuccess(
        `Answer preview: ${response.data.answer.substring(0, 100)}...`
      );
      logSuccess(`Sources found: ${response.data.sources?.length || 0}`);
      logSuccess(
        `AI service response time: ${response.data.response_time_ms}ms`
      );
      logSuccess(`Total request time: ${totalTime}ms`);
      logSuccess(
        `Confidence score: ${response.data.confidence_score || "N/A"}`
      );

      // 性能警告
      if (totalTime > 10000) {
        logWarning(
          `⚠️ Response time is high (${totalTime}ms). Consider optimization.`
        );
      } else if (totalTime < 5000) {
        logSuccess(`🚀 Great response time! Optimizations are working.`);
      }

      return true;
    } else {
      logError("Chat endpoint returned unexpected response format");
      return false;
    }
  } catch (error) {
    if (error.response) {
      logError(
        `Chat request failed with status ${error.response.status}: ${error.response.data?.message || error.message}`
      );
    } else {
      logError(`Chat request failed: ${error.message}`);
    }
    return false;
  }
}

async function testFrontendDevServer() {
  logTest("Testing Frontend Development Server");

  try {
    const response = await axios.get(FRONTEND_DEV_URL, {
      timeout: 5000,
    });

    if (response.status === 200) {
      logSuccess("Frontend development server is running");
      logSuccess(`Accessible at: ${FRONTEND_DEV_URL}`);
      return true;
    } else {
      logError(`Frontend server returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      logWarning("Frontend development server is not running on port 5173");
      logWarning("Start it with: cd packages/docs-site && pnpm dev");
    } else {
      logError(`Frontend server check failed: ${error.message}`);
    }
    return false;
  }
}

async function testComponentIntegration() {
  logTest("Testing Component File Integration");

  try {
    // Check if required files exist
    const fs = await import("fs/promises");
    const path = await import("path");

    const filesToCheck = [
      "src/components/ChatbotWindow.vue",
      "src/api/ai.ts",
      "src/pages/Index.vue",
    ];

    let allFilesExist = true;

    for (const file of filesToCheck) {
      try {
        const filePath = path.join(process.cwd(), file);
        await fs.access(filePath);
        logSuccess(`✓ ${file} exists`);
      } catch {
        logError(`✗ ${file} is missing`);
        allFilesExist = false;
      }
    }

    if (allFilesExist) {
      logSuccess("All component files are in place");

      // Check if Index.vue contains ChatbotWindow import
      const indexContent = await fs.readFile("src/pages/Index.vue", "utf-8");
      if (indexContent.includes("ChatbotWindow")) {
        logSuccess("ChatbotWindow is imported in Index.vue");
      } else {
        logError("ChatbotWindow is not imported in Index.vue");
        allFilesExist = false;
      }

      // Check if api/index.ts contains askAI function
      const apiContent = await fs.readFile("src/api/index.ts", "utf-8");
      if (apiContent.includes("askAI")) {
        logSuccess("askAI convenience function is available in api/index.ts");
      } else {
        logError("askAI function is missing from api/index.ts");
        allFilesExist = false;
      }
    }

    return allFilesExist;
  } catch (error) {
    logError(`Component integration test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  logHeader("AI Service Integration Test Suite");
  log("Testing the integration between AI service and frontend...", "white");

  const results = {
    aiHealth: false,
    aiChat: false,
    frontend: false,
    components: false,
  };

  // Run tests
  results.aiHealth = await testAIServiceHealth();

  if (results.aiHealth) {
    results.aiChat = await testAIChatEndpoint();
  }

  results.frontend = await testFrontendDevServer();
  results.components = await testComponentIntegration();

  // Summary
  logHeader("Test Results Summary");

  const tests = [
    { name: "AI Service Health", passed: results.aiHealth, critical: true },
    { name: "AI Chat Endpoint", passed: results.aiChat, critical: true },
    { name: "Frontend Dev Server", passed: results.frontend, critical: false },
    {
      name: "Component Integration",
      passed: results.components,
      critical: true,
    },
  ];

  let passedCount = 0;
  let criticalPassed = 0;
  let totalCritical = 0;

  tests.forEach((test) => {
    if (test.passed) {
      logSuccess(`${test.name}: PASSED`);
      passedCount++;
      if (test.critical) criticalPassed++;
    } else {
      logError(`${test.name}: FAILED${test.critical ? " (CRITICAL)" : ""}`);
    }
    if (test.critical) totalCritical++;
  });

  log(
    `\nResults: ${passedCount}/${tests.length} tests passed`,
    passedCount === tests.length ? "green" : "yellow"
  );
  log(
    `Critical: ${criticalPassed}/${totalCritical} critical tests passed`,
    criticalPassed === totalCritical ? "green" : "red"
  );

  if (criticalPassed === totalCritical) {
    logSuccess(
      "\n🎉 All critical tests passed! AI integration is ready to use."
    );
    log("\nTo test the full integration:", "cyan");
    log(
      "1. Start the AI service: cd packages/ai-service && poetry run python src/main.py",
      "white"
    );
    log("2. Start the frontend: cd packages/docs-site && pnpm dev", "white");
    log(
      "3. Open http://localhost:5173 and click the AI assistant in the bottom right",
      "white"
    );
  } else {
    logError(
      "\n❌ Critical tests failed. Please fix the issues above before using the AI integration."
    );
  }

  return criticalPassed === totalCritical;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logError(`Test suite failed: ${error.message}`);
      process.exit(1);
    });
}

export { runAllTests };
