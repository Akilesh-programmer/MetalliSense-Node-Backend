const GradeSpec = require('../models/gradeSpecModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Standard CRUD operations using factory
exports.getAllGrades = factory.getAll(GradeSpec);
exports.getGrade = factory.getOne(GradeSpec);
exports.createGrade = factory.createOne(GradeSpec);
exports.updateGrade = factory.updateOne(GradeSpec);
exports.deleteGrade = factory.deleteOne(GradeSpec);

// Get grade by name (alternative to ID)
exports.getGradeByName = catchAsync(async (req, res, next) => {
  const { gradeName } = req.params;
  const grade = await GradeSpec.findOne({
    grade: gradeName.toUpperCase(),
  });

  if (!grade) {
    return next(new AppError(`Grade '${gradeName}' not found`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: { grade },
  });
});

// Get composition ranges for a specific grade
exports.getCompositionRanges = catchAsync(async (req, res, next) => {
  const { gradeName } = req.params;
  const grade = await GradeSpec.findOne({
    grade: gradeName.toUpperCase(),
  });

  if (!grade) {
    return next(new AppError(`Grade '${gradeName}' not found`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      grade: grade.grade,
      composition_ranges: grade.composition_ranges,
    },
  });
});
