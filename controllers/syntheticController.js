const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const opcuaService = require('../services/opcuaService');
const GradeSpec = require('../models/gradeSpecModel');
const TrainingData = require('../models/trainingDataModel');

// Get OPC connection status
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

// Connect OPC UA Client
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

// Disconnect OPC UA Client
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

// Generate synthetic reading with deviations using training data
exports.generateSyntheticReading = catchAsync(async (req, res, next) => {
  const {
    metalGrade,
    deviationElements = [],
    deviationPercentage = 10,
  } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  // Validate that the grade exists in our grade specifications
  const gradeSpec = await GradeSpec.findOne({
    grade: metalGrade.toUpperCase(),
  });

  if (!gradeSpec) {
    return next(
      new AppError(
        `Metal grade '${metalGrade}' not found in specifications`,
        400,
      ),
    );
  }

  // Get a random normal sample from training data for this grade
  const normalSamples = await TrainingData.find({
    grade: metalGrade.toUpperCase(),
    sample_type: 'normal',
  }).limit(100);

  if (normalSamples.length === 0) {
    return next(
      new AppError(`No training data found for grade '${metalGrade}'`, 404),
    );
  }

  // Pick a random sample as base
  const baseSample =
    normalSamples[Math.floor(Math.random() * normalSamples.length)];

  // Generate composition with deviations
  const composition = {
    Fe: baseSample.Fe,
    C: baseSample.C,
    Si: baseSample.Si,
    Mn: baseSample.Mn,
    P: baseSample.P,
    S: baseSample.S,
  };

  // Apply deviations to specified elements - Can go BELOW min but NEVER above max
  const appliedDeviations = [];

  deviationElements.forEach((element) => {
    // Normalize element to PascalCase format (e.g., "fe" or "FE" -> "Fe")
    const normalizedElement =
      element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();

    if (composition[normalizedElement] !== undefined) {
      const baseValue = composition[normalizedElement];
      const range = gradeSpec.composition_ranges[normalizedElement];

      if (range) {
        const [min, max] = range;
        const tolerance = (max - min) / 2;
        const deviationAmount = (tolerance * deviationPercentage) / 100;

        // Always deviate BELOW the minimum (never above maximum)
        composition[normalizedElement] = Math.max(0, min - deviationAmount);
      } else {
        // If no range defined, apply percentage deviation to base value
        const deviation =
          (Math.random() - 0.5) * 2 * (deviationPercentage / 100);
        composition[normalizedElement] = Math.max(
          0,
          baseValue * (1 + deviation),
        );
      }

      appliedDeviations.push({
        element: normalizedElement,
        original: parseFloat(baseValue.toFixed(4)),
        deviated: parseFloat(composition[normalizedElement].toFixed(4)),
        deviationPercent: parseFloat(
          (
            ((composition[normalizedElement] - baseValue) / baseValue) *
            100
          ).toFixed(2),
        ),
      });
    }
  });

  // Generate temperature and pressure
  const temperature = Math.round(1400 + Math.random() * 200); // 1400-1600°C
  const pressure = parseFloat((0.95 + Math.random() * 0.1).toFixed(2)); // 0.95-1.05 atm

  // Build response
  const syntheticReading = {
    metalGrade: metalGrade.toUpperCase(),
    composition: {
      Fe: parseFloat(composition.Fe.toFixed(4)),
      C: parseFloat(composition.C.toFixed(4)),
      Si: parseFloat(composition.Si.toFixed(4)),
      Mn: parseFloat(composition.Mn.toFixed(4)),
      P: parseFloat(composition.P.toFixed(4)),
      S: parseFloat(composition.S.toFixed(4)),
    },
    temperature,
    pressure,
    deviationElements,
    deviationPercentage,
    appliedDeviations,
    baseSampleId: baseSample._id,
    timestamp: new Date(),
    source: 'training_data',
  };

  res.status(200).json({
    status: 'success',
    data: {
      reading: syntheticReading,
    },
  });
});
