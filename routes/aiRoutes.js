const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

// AI service health check
router.get('/health', aiController.getAIServiceHealth);

// Individual AI analysis (calls anomaly + alloy endpoints separately)
router.post('/individual/analyze', aiController.analyzeIndividual);

// Agent-based AI analysis (calls agent endpoint)
router.post('/agent/analyze', aiController.analyzeWithAgent);

// ============================================
// GEMINI AI EXPLANATION ROUTES
// ============================================

// Check Gemini service availability
router.get('/gemini/health', aiController.getGeminiHealth);

// Get comprehensive explanation for existing ML predictions
router.post('/explain', aiController.explainAnalysis);

// Complete analysis with Gemini explanation (generate synthetic + ML + explanation)
router.post('/analyze-with-explanation', aiController.analyzeWithExplanation);

// What-if analysis - answer operator questions about alternatives
router.post('/what-if', aiController.whatIfAnalysis);

module.exports = router;
