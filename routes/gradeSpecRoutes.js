const express = require('express');
const gradeSpecController = require('../controllers/gradeSpecController');

const router = express.Router();

// Get composition ranges for a specific grade
router.get('/:gradeName/composition', gradeSpecController.getCompositionRanges);

// Get grade by name
router.get('/:gradeName', gradeSpecController.getGradeByName);

// Standard CRUD routes
router
  .route('/')
  .get(gradeSpecController.getAllGrades)
  .post(gradeSpecController.createGrade);

router
  .route('/:id')
  .get(gradeSpecController.getGrade)
  .patch(gradeSpecController.updateGrade)
  .delete(gradeSpecController.deleteGrade);

module.exports = router;
