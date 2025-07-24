const express = require('express');
const authController = require('../controllers/authController');
const metalGradeController = require('../controllers/metalGradeController');

const router = express.Router();

router.use(authController.protect);

router.get('/names', metalGradeController.getGradeNames);
router.post('/by-name', metalGradeController.getMetalGradeByName);
router.post('/elements', metalGradeController.getGradeElements);
router.post('/composition-ranges', metalGradeController.getCompositionRanges);
router.post('/check-specs', metalGradeController.checkCompositionSpecs);

router
  .route('/')
  .get(metalGradeController.getAllMetalGrades)
  .post(metalGradeController.createMetalGrade);

router
  .route('/:id')
  .get(metalGradeController.getMetalGrade)
  .patch(metalGradeController.updateMetalGrade)
  .delete(metalGradeController.deleteMetalGrade);

module.exports = router;
