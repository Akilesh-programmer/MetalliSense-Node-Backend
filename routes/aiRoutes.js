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

module.exports = router;
