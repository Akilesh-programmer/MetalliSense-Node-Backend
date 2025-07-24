const MetalGradeSpec = require('../models/metalGradeModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllMetalGrades = factory.getAll(MetalGradeSpec);
exports.getMetalGrade = factory.getOne(MetalGradeSpec);
exports.createMetalGrade = factory.createOne(MetalGradeSpec);
exports.updateMetalGrade = factory.updateOne(MetalGradeSpec);
exports.deleteMetalGrade = factory.deleteOne(MetalGradeSpec);

// Custom controller - Get metal grade by name
exports.getMetalGradeByName = catchAsync(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(
      new AppError('Metal grade name is required in request body', 400),
    );
  }

  const metalGrade = await MetalGradeSpec.findOne({
    metal_grade: name.toUpperCase(),
  });

  if (!metalGrade) {
    return next(new AppError(`No metal grade found with name: ${name}`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      metalGrade,
    },
  });
});

// Custom controller - Get only grade names (for frontend dropdown)
exports.getGradeNames = catchAsync(async (req, res, next) => {
  const grades = await MetalGradeSpec.getGradeNames();
  const gradeNames = grades.map((grade) => grade.metal_grade);

  res.status(200).json({
    status: 'success',
    results: gradeNames.length,
    data: {
      gradeNames,
    },
  });
});

// Custom controller - Get elements for a specific grade
exports.getGradeElements = catchAsync(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(
      new AppError('Metal grade name is required in request body', 400),
    );
  }

  const metalGrade = await MetalGradeSpec.findOne({
    metal_grade: name.toUpperCase(),
  });

  if (!metalGrade) {
    return next(new AppError(`No metal grade found with name: ${name}`, 404));
  }

  const elements = Array.from(metalGrade.composition_range.keys());

  res.status(200).json({
    status: 'success',
    data: {
      metalGrade: metalGrade.metal_grade,
      elements,
    },
  });
});

// Custom controller - Check if composition is within specs
exports.checkCompositionSpecs = catchAsync(async (req, res, next) => {
  const { metalGrade: gradeName, composition } = req.body;

  if (!gradeName || !composition) {
    return next(
      new AppError('Metal grade name and composition are required', 400),
    );
  }

  const metalGrade = await MetalGradeSpec.findOne({
    metal_grade: gradeName.toUpperCase(),
  });

  if (!metalGrade) {
    return next(
      new AppError(`No metal grade found with name: ${gradeName}`, 404),
    );
  }

  const specResults = metalGrade.isWithinSpecs(composition);

  // Calculate overall compliance
  const totalElements = Object.keys(specResults).length;
  const compliantElements = Object.values(specResults).filter(
    (result) => result.withinRange,
  ).length;
  const overallCompliance =
    totalElements > 0 ? (compliantElements / totalElements) * 100 : 0;

  res.status(200).json({
    status: 'success',
    data: {
      metalGrade: gradeName,
      overallCompliance: Math.round(overallCompliance * 100) / 100, // Round to 2 decimal places
      elementResults: specResults,
      summary: {
        total: totalElements,
        compliant: compliantElements,
        nonCompliant: totalElements - compliantElements,
      },
    },
  });
});

// Custom controller - Get composition ranges for specific elements
exports.getCompositionRanges = catchAsync(async (req, res, next) => {
  const { elements } = req.body; // elements should be an array like ["C", "Si", "Mn"]

  const metalGrades = await MetalGradeSpec.find(
    {},
    'metal_grade composition_range',
  );

  let result = metalGrades;

  // If specific elements requested, filter them
  if (elements && Array.isArray(elements)) {
    const elementArray = elements.map((el) => el.trim().toUpperCase());
    result = metalGrades.map((grade) => {
      const filteredComposition = new Map();
      elementArray.forEach((element) => {
        if (grade.composition_range.has(element)) {
          filteredComposition.set(
            element,
            grade.composition_range.get(element),
          );
        }
      });

      return {
        metal_grade: grade.metal_grade,
        composition_range: Object.fromEntries(filteredComposition),
      };
    });
  }

  res.status(200).json({
    status: 'success',
    results: result.length,
    data: {
      metalGrades: result,
    },
  });
});
