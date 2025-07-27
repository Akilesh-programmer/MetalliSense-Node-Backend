const SpectrometerReading = require('../models/spectrometerReadingModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const opcuaService = require('../services/opcuaService');

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

// OPC UA Integration - Request reading via OPC server
exports.requestOPCReading = catchAsync(async (req, res, next) => {
  const {
    metalGrade,
    deviationElements = [],
    deviationPercentage = 10,
  } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  try {
    // Validate metal grade exists
    const MetalGradeSpec = require('../models/metalGradeModel');
    const gradeExists = await MetalGradeSpec.findOne({
      metal_grade: metalGrade.toUpperCase(),
    });

    if (!gradeExists) {
      return next(
        new AppError(
          `Metal grade '${metalGrade}' not found in specifications`,
          400,
        ),
      );
    }

    // Request reading via OPC UA
    const result = await opcuaService.requestSpectrometerReading(
      metalGrade,
      deviationElements,
      deviationPercentage,
    );

    if (!result.success) {
      return next(new AppError(`OPC UA Error: ${result.error}`, 500));
    }

    // Save reading to database
    const readingData = {
      metal_grade: result.data.metalGrade,
      composition: new Map(Object.entries(result.data.composition)),
      temperature: result.data.temperature,
      pressure: result.data.pressure,
      is_synthetic: true,
      deviation_applied: deviationElements.length > 0,
      deviation_elements: deviationElements,
      notes: `Generated via OPC UA from ${result.data.opcEndpoint}`,
    };

    // Add operator if user is authenticated
    if (req.user) {
      readingData.operator_id = req.user._id;
    }

    const reading = await SpectrometerReading.create(readingData);

    res.status(201).json({
      status: 'success',
      data: {
        reading,
        opcData: result.data,
        deviationsApplied: reading.deviation_elements,
      },
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

// Get OPC UA status
exports.getOPCStatus = catchAsync(async (req, res, next) => {
  const status = opcuaService.getOPCStatus();

  res.status(200).json({
    status: 'success',
    data: {
      opcStatus: status,
      timestamp: new Date(),
    },
  });
});

// Connect OPC UA Client (Frontend-controlled)
exports.connectOPCClient = catchAsync(async (req, res, next) => {
  const result = await opcuaService.connectClient();

  if (result.success) {
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        clientStatus: result.status,
        timestamp: new Date(),
      },
    });
  } else {
    return next(new AppError(`OPC Connection Error: ${result.error}`, 500));
  }
});

// Disconnect OPC UA Client (Frontend-controlled)
exports.disconnectOPCClient = catchAsync(async (req, res, next) => {
  const result = await opcuaService.disconnectClient();

  if (result.success) {
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        clientStatus: result.status,
        timestamp: new Date(),
      },
    });
  } else {
    return next(new AppError(`OPC Disconnection Error: ${result.error}`, 500));
  }
});
