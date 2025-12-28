const express = require('express');
const aiController = require('../controllers/aiController');
const {
  protect,
  optionalAuth,
} = require('../middleware/firebaseAuthMiddleware');

const router = express.Router();

// AI service health check (public)
router.get('/health', aiController.getAIServiceHealth);

// Individual AI analysis (requires authentication)
router.post('/individual/analyze', protect, aiController.analyzeIndividual);

// Agent-based AI analysis (requires authentication)
router.post('/agent/analyze', protect, aiController.analyzeWithAgent);

// Anomaly prediction (requires authentication)
router.post('/anomaly/predict', protect, aiController.predictAnomaly);

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
