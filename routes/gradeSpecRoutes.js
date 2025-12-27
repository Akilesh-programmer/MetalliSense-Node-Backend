const express = require('express');
const gradeSpecController = require('../controllers/gradeSpecController');
const {
  protect,
  optionalAuth,
} = require('../middleware/firebaseAuthMiddleware');

const router = express.Router();

// Get composition ranges for a specific grade (public with optional auth)
router.get(
  '/:gradeName/composition',
  optionalAuth,
  gradeSpecController.getCompositionRanges,
);

// Get grade by name (public with optional auth)
router.get('/:gradeName', optionalAuth, gradeSpecController.getGradeByName);

// Standard CRUD routes
router
  .route('/')
  .get(optionalAuth, gradeSpecController.getAllGrades) // Public read
  .post(protect, gradeSpecController.createGrade); // Requires auth

router
  .route('/:id')
  .get(optionalAuth, gradeSpecController.getGrade) // Public read
  .patch(protect, gradeSpecController.updateGrade) // Requires auth
  .delete(protect, gradeSpecController.deleteGrade); // Requires auth

module.exports = router;
