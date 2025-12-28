/**
 * Test script for Gemini AI Explanation Service
 * Run with: node test-gemini-integration.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v2/ai';

// Test data
const testData = {
  analyzeWithExplanation: {
    metalGrade: 'SG-IRON',
    deviationElements: ['C', 'Si'],
    deviationPercentage: 20,
    batchContext: {
      batch_id: 'TEST-BATCH-001',
      melt_time_minutes: 45,
    },
  },
  explainAnalysis: {
    metalGrade: 'SG-IRON',
    composition: {
      Fe: 81.2,
      C: 4.4,
      Si: 3.1,
      Mn: 0.4,
      P: 0.05,
      S: 0.02,
    },
    anomalyResult: {
      is_anomaly: true,
      severity: 'HIGH',
      anomaly_score: 0.87,
      confidence: 0.93,
    },
    alloyResult: {
      recommended_additions: {
        Si: 0.22,
        Mn: 0.15,
      },
      confidence: 0.91,
    },
    batchContext: {
      batch_id: 'TEST-BATCH-002',
      furnace_temp: 1450,
      melt_time_minutes: 45,
    },
  },
  whatIfAnalysis: {
    metalGrade: 'SG-IRON',
    composition: {
      Fe: 81.2,
      C: 4.4,
      Si: 3.1,
      Mn: 0.4,
      P: 0.05,
      S: 0.02,
    },
    alloyResult: {
      recommended_additions: {
        Si: 0.22,
        Mn: 0.15,
      },
      confidence: 0.91,
    },
    userQuestion: 'What if I add only half the recommended silicon?',
  },
};

// Helper function for colored console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function printSeparator() {
  console.log('\n' + '='.repeat(80) + '\n');
}

// Test functions
async function testGeminiHealth() {
  log(colors.cyan, '🔍 TEST 1: Gemini Service Health Check');
  try {
    const response = await axios.get(`${BASE_URL}/gemini/health`);
    log(colors.green, '✅ Gemini service is available');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log(
      colors.red,
      `❌ Gemini health check failed: ${error.response?.data?.message || error.message}`,
    );
    return false;
  }
}

async function testAnalyzeWithExplanation() {
  log(
    colors.cyan,
    '🔍 TEST 2: Complete Analysis with Explanation (Synthetic + ML + Gemini)',
  );
  try {
    const response = await axios.post(
      `${BASE_URL}/analyze-with-explanation`,
      testData.analyzeWithExplanation,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      },
    );

    log(colors.green, '✅ Analysis completed successfully');
    console.log('\n📊 Response Summary:');
    console.log(`- Status: ${response.data.status}`);
    console.log(
      `- Synthetic Reading Generated: ${response.data.data.syntheticReading ? '✓' : '✗'}`,
    );
    console.log(
      `- ML Analysis Available: ${response.data.data.mlAnalysis.serviceAvailable ? '✓' : '✗'}`,
    );
    console.log(
      `- Gemini Explanation Generated: ${response.data.data.geminiExplanation ? '✓' : '✗'}`,
    );
    console.log(
      `- Safety Check: ${response.data.data.safetyCheck.isSafe ? 'SAFE ✓' : 'UNSAFE ⚠️'}`,
    );

    console.log('\n📝 Gemini Explanation:');
    log(
      colors.yellow,
      response.data.data.geminiExplanation.explanation.substring(0, 500) +
        '...',
    );

    if (response.data.data.safetyCheck.warnings.length > 0) {
      console.log('\n⚠️ Safety Warnings:');
      response.data.data.safetyCheck.warnings.forEach((w) =>
        console.log(`  ${w}`),
      );
    }

    if (response.data.data.safetyCheck.errors.length > 0) {
      console.log('\n🚨 Safety Errors:');
      response.data.data.safetyCheck.errors.forEach((e) => console.log(`  ${e}`));
    }

    return true;
  } catch (error) {
    log(
      colors.red,
      `❌ Analysis failed: ${error.response?.data?.message || error.message}`,
    );
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testExplainAnalysis() {
  log(colors.cyan, '🔍 TEST 3: Explain Existing ML Predictions');
  try {
    const response = await axios.post(`${BASE_URL}/explain`, testData.explainAnalysis, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    log(colors.green, '✅ Explanation generated successfully');
    console.log('\n📊 Response Summary:');
    console.log(`- Status: ${response.data.status}`);
    console.log(
      `- Severity Level: ${response.data.data.geminiExplanation.severity_level}`,
    );
    console.log(
      `- Confidence: ${(response.data.data.geminiExplanation.confidence * 100).toFixed(1)}%`,
    );
    console.log(
      `- Safety: ${response.data.data.safetyCheck.isSafe ? 'SAFE ✓' : 'UNSAFE ⚠️'}`,
    );

    console.log('\n📝 Gemini Explanation (excerpt):');
    log(
      colors.yellow,
      response.data.data.geminiExplanation.explanation.substring(0, 500) +
        '...',
    );

    return true;
  } catch (error) {
    log(
      colors.red,
      `❌ Explanation failed: ${error.response?.data?.message || error.message}`,
    );
    return false;
  }
}

async function testWhatIfAnalysis() {
  log(colors.cyan, '🔍 TEST 4: What-If Analysis');
  try {
    const response = await axios.post(
      `${BASE_URL}/what-if`,
      testData.whatIfAnalysis,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      },
    );

    log(colors.green, '✅ What-if analysis completed');
    console.log('\n📊 Response Summary:');
    console.log(`- Question: ${response.data.data.question}`);
    console.log('\n📝 Analysis:');
    log(colors.yellow, response.data.data.analysis);

    return true;
  } catch (error) {
    log(
      colors.red,
      `❌ What-if analysis failed: ${error.response?.data?.message || error.message}`,
    );
    return false;
  }
}

async function testAIServiceHealth() {
  log(colors.cyan, '🔍 TEST 5: ML AI Service Health Check');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    log(colors.green, '✅ ML AI service is available');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log(
      colors.red,
      `❌ ML AI service health check failed: ${error.response?.data?.message || error.message}`,
    );
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log(colors.blue, '\n🚀 Starting Gemini AI Integration Tests\n');
  log(colors.blue, `Target Server: ${BASE_URL}\n`);

  const results = {
    geminiHealth: false,
    aiServiceHealth: false,
    analyzeWithExplanation: false,
    explainAnalysis: false,
    whatIfAnalysis: false,
  };

  printSeparator();

  // Test 1: Gemini Health
  results.geminiHealth = await testGeminiHealth();
  printSeparator();

  // Test 5: AI Service Health
  results.aiServiceHealth = await testAIServiceHealth();
  printSeparator();

  // Only proceed with other tests if services are available
  if (results.geminiHealth) {
    // Test 2: Analyze with Explanation
    results.analyzeWithExplanation = await testAnalyzeWithExplanation();
    printSeparator();

    // Test 3: Explain Analysis
    results.explainAnalysis = await testExplainAnalysis();
    printSeparator();

    // Test 4: What-If Analysis
    results.whatIfAnalysis = await testWhatIfAnalysis();
    printSeparator();
  } else {
    log(
      colors.red,
      '⚠️ Skipping integration tests - Gemini service not available',
    );
    printSeparator();
  }

  // Summary
  log(colors.blue, '\n📊 TEST SUMMARY\n');
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter((r) => r === true).length;

  console.log(`Gemini Health Check:           ${results.geminiHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`ML AI Service Health:          ${results.aiServiceHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Analyze with Explanation:      ${results.analyzeWithExplanation ? '✅ PASS' : '⏭️  SKIP'}`);
  console.log(`Explain Analysis:              ${results.explainAnalysis ? '✅ PASS' : '⏭️  SKIP'}`);
  console.log(`What-If Analysis:              ${results.whatIfAnalysis ? '✅ PASS' : '⏭️  SKIP'}`);

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    log(colors.green, '\n🎉 ALL TESTS PASSED!\n');
  } else if (passed > 0) {
    log(colors.yellow, '\n⚠️ SOME TESTS FAILED\n');
  } else {
    log(colors.red, '\n❌ ALL TESTS FAILED\n');
  }

  printSeparator();
}

// Run tests
runAllTests().catch((error) => {
  log(colors.red, `\n❌ Test suite error: ${error.message}\n`);
  process.exit(1);
});
