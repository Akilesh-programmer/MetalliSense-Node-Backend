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

// Generates a synthetic reading via OPC UA based on a single metal grade input.
// Randomly chooses whether the reading is fully within spec or has 1-4 deviated elements.
exports.metalAloneGeneration = catchAsync(async (req, res, next) => {
  const { metalGrade } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  // Validate metal grade exists
  const MetalGradeSpec = require('../models/metalGradeModel');
  const gradeSpec = await MetalGradeSpec.findOne({
    metal_grade: metalGrade.toUpperCase(),
  });

  if (!gradeSpec) {
    return next(
      new AppError(`Metal grade '${metalGrade}' not found in specifications`, 400),
    );
  }

  // Decide whether to generate a correct reading or include deviations
  const makeIncorrect = Math.random() < 0.5; // 50% chance to introduce deviations

  let deviationElements = [];
  // If we should introduce deviations, pick between 1 and 4 random elements from spec
  if (makeIncorrect) {
    const elements = Array.from(gradeSpec.composition_range.keys());
    if (elements.length > 0) {
      const maxDeviations = Math.min(4, elements.length);
      const count = Math.floor(1 + Math.random() * maxDeviations); // 1..maxDeviations

      // Pick `count` unique random elements
      const shuffled = elements.sort(() => 0.5 - Math.random());
      deviationElements = shuffled.slice(0, count);
    }
  }

  // Random deviation percentage between 5% and 20%
  const deviationPercentage = Math.round(5 + Math.random() * 15);

  // Request the OPC UA server to generate the reading using the service
  const result = await opcuaService.requestSpectrometerReading(
    metalGrade,
    deviationElements,
    deviationPercentage,
  );

  if (!result.success) {
    return next(new AppError(`OPC UA Error: ${result.error}`, 500));
  }

  // Return the raw OPC data and metadata about deviations
  res.status(200).json({
    status: 'success',
    data: {
      opcData: result.data,
      deviationsRequested: deviationElements,
      deviationPercentageRequested: deviationPercentage,
      note: makeIncorrect
        ? 'This reading includes intentional deviations for testing.'
        : 'This reading was generated without intentional deviations (within spec).',
    },
  });
});

// Generates synthetic readings for Raw and Scrap parts based on weight split
exports.metalScrapSyntheticReading = catchAsync(async (req, res, next) => {
  const { metalGrade, totalWeight, rawWeight, scrapWeight } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  if (typeof totalWeight !== 'number' || totalWeight <= 0) {
    return next(new AppError('totalWeight must be a positive number', 400));
  }

  // Determine weights
  let rawW = rawWeight;
  let scrapW = scrapWeight;

  if (typeof rawW !== 'number' && typeof scrapW !== 'number') {
    return next(
      new AppError('At least one of rawWeight or scrapWeight must be provided', 400),
    );
  }

  if (typeof rawW !== 'number') rawW = totalWeight - scrapW;
  if (typeof scrapW !== 'number') scrapW = totalWeight - rawW;

  // Validate derived sums
  const sum = Math.round((rawW + scrapW) * 1000) / 1000;
  if (Math.abs(sum - totalWeight) > 0.001) {
    return next(
      new AppError('rawWeight + scrapWeight must equal totalWeight', 400),
    );
  }

  // Validate metal grade exists
  const MetalGradeSpec = require('../models/metalGradeModel');
  const gradeSpec = await MetalGradeSpec.findOne({
    metal_grade: metalGrade.toUpperCase(),
  });

  if (!gradeSpec) {
    return next(
      new AppError(`Metal grade '${metalGrade}' not found in specifications`, 400),
    );
  }

  // Helper: pick a random integer between min and max inclusive
  const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

  // Helper: simulate temperature and pressure similar to spectrometer server
  const simulateTemperature = () => Math.round(1400 + Math.random() * 200);
  const simulatePressure = () => Math.round((0.95 + Math.random() * 0.1) * 100) / 100;

  // Elements available for this grade
  const elements = Array.from(gradeSpec.composition_range.keys());

  // For each part (raw and scrap) choose 0 or 1-4 deviations randomly
  const chooseDeviations = () => {
    const makeIncorrect = Math.random() < 0.5; // 50% chance
    if (!makeIncorrect) return [];
    const maxDevs = Math.min(4, elements.length);
    const count = randInt(1, Math.max(1, maxDevs));
    const shuffled = elements.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const rawDeviations = chooseDeviations();
  const scrapDeviations = chooseDeviations();

  const rawDeviationPercentage = randInt(5, 20);
  const scrapDeviationPercentage = randInt(5, 20);

  // Use OPC UA service to request readings for raw and scrap parts
  const rawResult = await opcuaService.requestSpectrometerReading(
    metalGrade,
    rawDeviations,
    rawDeviationPercentage,
  );

  if (!rawResult.success) {
    return next(new AppError(`OPC UA Error (raw): ${rawResult.error}`, 500));
  }

  const scrapResult = await opcuaService.requestSpectrometerReading(
    metalGrade,
    scrapDeviations,
    scrapDeviationPercentage,
  );

  if (!scrapResult.success) {
    return next(new AppError(`OPC UA Error (scrap): ${scrapResult.error}`, 500));
  }

  // Extract compositions from OPC results (already plain objects)
  const rawCompObj = rawResult.data.composition || {};
  const scrapCompObj = scrapResult.data.composition || {};

  // Compute weighted combined composition
  const combined = {};
  const total = totalWeight;
  const parts = [rawCompObj, scrapCompObj];
  const weights = [rawW, scrapW];

  const allElements = new Set([...Object.keys(rawCompObj), ...Object.keys(scrapCompObj)]);
  for (const el of allElements) {
    const rawVal = rawCompObj[el] || 0;
    const scrapVal = scrapCompObj[el] || 0;
    const weighted = (rawVal * weights[0] + scrapVal * weights[1]) / total;
    combined[el] = Math.round(weighted * 1000) / 1000; // 3 decimals
  }

  // Build response payload
  const response = {
    status: 'success',
    data: {
      metalGrade: metalGrade.toUpperCase(),
      totalWeight: total,
        raw: {
          weight: rawW,
          weightFraction: Math.round((rawW / total) * 10000) / 100, // percent, 2 decimals
          composition: rawCompObj,
          deviationElements: rawDeviations,
          deviationPercentage: rawDeviationPercentage,
          temperature: rawResult.data.temperature || simulateTemperature(),
          pressure: rawResult.data.pressure || simulatePressure(),
        },
      scrap: {
          weight: scrapW,
          weightFraction: Math.round((scrapW / total) * 10000) / 100,
          composition: scrapCompObj,
          deviationElements: scrapDeviations,
          deviationPercentage: scrapDeviationPercentage,
          temperature: scrapResult.data.temperature || simulateTemperature(),
          pressure: scrapResult.data.pressure || simulatePressure(),
        },
      combinedComposition: combined,
      timestamp: new Date(),
    },
  };

  res.status(200).json(response);
});
