const express = require('express');
const trainingDataController = require('../controllers/trainingDataController');

const router = express.Router();

// Paginated endpoint (must be before other routes to avoid conflicts)
router.get('/paginated', trainingDataController.getPaginatedTrainingData);

// Visualization data endpoint for charts and analytics
router.get('/visualizations', trainingDataController.getVisualizationData);

// Get statistics for a specific grade
router.get(
  '/grade/:gradeName/statistics',
  trainingDataController.getGradeStatistics,
);

// Get training data by grade
router.get('/grade/:gradeName', trainingDataController.getTrainingDataByGrade);

// Standard CRUD routes
router
  .route('/')
  .get(trainingDataController.getAllTrainingData)
  .post(trainingDataController.createTrainingData);

router
  .route('/:id')
  .get(trainingDataController.getTrainingDataById)
  .patch(trainingDataController.updateTrainingData)
  .delete(trainingDataController.deleteTrainingData);

module.exports = router;
