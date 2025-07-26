const SpectrometerReading = require('../models/spectrometerReadingModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Standard CRUD operations using factory
exports.getAllReadings = factory.getAll(SpectrometerReading);
exports.getReading = factory.getOne(SpectrometerReading, {
  path: 'operator_id',
  select: 'name email',
});
exports.createReading = factory.createOne(SpectrometerReading);
exports.updateReading = factory.updateOne(SpectrometerReading);
exports.deleteReading = factory.deleteOne(SpectrometerReading);

// Custom controller - Create reading with validation
exports.createReadingWithValidation = catchAsync(async (req, res, next) => {
  const readingData = { ...req.body };

  // Add operator if user is authenticated
  if (req.user) {
    readingData.operator_id = req.user._id;
  }

  // Validate metal grade exists
  const MetalGradeSpec = require('../models/metalGradeModel');
  const gradeExists = await MetalGradeSpec.findOne({
    metal_grade: readingData.metal_grade?.toUpperCase(),
  });

  if (!gradeExists) {
    return next(
      new AppError(
        `Metal grade '${readingData.metal_grade}' not found in specifications`,
        400,
      ),
    );
  }

  const reading = await SpectrometerReading.create(readingData);

  res.status(201).json({
    status: 'success',
    data: {
      reading,
    },
  });
});

// Custom controller - Generate synthetic reading with optional deviations
exports.generateSyntheticReading = catchAsync(async (req, res, next) => {
  const {
    metalGrade,
    deviationElements = [],
    deviationPercentage = 10,
  } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  try {
    const syntheticData = await SpectrometerReading.generateSyntheticReading(
      metalGrade,
      deviationElements,
      deviationPercentage,
    );

    // Add operator if user is authenticated
    if (req.user) {
      syntheticData.operator_id = req.user._id;
    }

    const reading = await SpectrometerReading.create(syntheticData);

    res.status(201).json({
      status: 'success',
      data: {
        reading,
        deviationsApplied: reading.deviation_elements,
      },
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});
