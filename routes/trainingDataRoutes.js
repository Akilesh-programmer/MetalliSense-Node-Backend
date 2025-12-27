const express = require('express');
const trainingDataController = require('../controllers/trainingDataController');
const {
  protect,
  optionalAuth,
} = require('../middleware/firebaseAuthMiddleware');

const router = express.Router();

// Paginated endpoint (public with optional auth)
router.get(
  '/paginated',
  optionalAuth,
  trainingDataController.getPaginatedTrainingData,
);

// Visualization data endpoint for charts and analytics (public with optional auth)
router.get(
  '/visualizations',
  optionalAuth,
  trainingDataController.getVisualizationData,
);

// Get statistics for a specific grade (public with optional auth)
router.get(
  '/grade/:gradeName/statistics',
  optionalAuth,
  trainingDataController.getGradeStatistics,
);

// Get training data by grade (public with optional auth)
router.get(
  '/grade/:gradeName',
  optionalAuth,
  trainingDataController.getTrainingDataByGrade,
);

// Standard CRUD routes
router
  .route('/')
  .get(optionalAuth, trainingDataController.getAllTrainingData) // Public read
  .post(protect, trainingDataController.createTrainingData); // Requires auth

router
  .route('/:id')
  .get(optionalAuth, trainingDataController.getTrainingDataById) // Public read
  .patch(protect, trainingDataController.updateTrainingData) // Requires auth
  .delete(protect, trainingDataController.deleteTrainingData); // Requires auth

module.exports = router;
