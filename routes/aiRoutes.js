const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

// AI service health check
router.get('/health', aiController.getAIServiceHealth);

// Individual AI analysis (calls anomaly + alloy endpoints separately)
router.post('/individual/analyze', aiController.analyzeIndividual);

// Agent-based AI analysis (calls agent endpoint)
router.post('/agent/analyze', aiController.analyzeWithAgent);

module.exports = router;
