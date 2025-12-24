const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const aiService = require('../services/aiService');
const GradeSpec = require('../models/gradeSpecModel');
const TrainingData = require('../models/trainingDataModel');

// Helper function to generate synthetic reading
const generateSyntheticReading = async (
  metalGrade,
  deviationElements = [],
  deviationPercentage = 10,
) => {
  // Validate grade
  const gradeSpec = await GradeSpec.findOne({
    grade: metalGrade.toUpperCase(),
  });

  if (!gradeSpec) {
    throw new AppError(
      `Metal grade '${metalGrade}' not found in specifications`,
      400,
    );
  }

  // Get a random normal sample from training data
  const normalSamples = await TrainingData.find({
    grade: metalGrade.toUpperCase(),
    sample_type: 'normal',
  }).limit(100);

  if (normalSamples.length === 0) {
    throw new AppError(`No training data found for grade '${metalGrade}'`, 404);
  }

  // Pick random sample as base
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

  // Apply deviations to specified elements
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

        // Randomly choose to deviate above max or below min
        const shouldDeviateUp = Math.random() > 0.5;

        if (shouldDeviateUp) {
          composition[normalizedElement] = max + deviationAmount; // Exceed upper limit
        } else {
          composition[normalizedElement] = Math.max(0, min - deviationAmount); // Go below lower limit (ensure non-negative)
        }
      } else {
        // If no range defined, apply percentage deviation to base value
        const deviation =
          ((Math.random() - 0.5) * 2 * deviationPercentage) / 100;
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
  const temperature = Math.round(1400 + Math.random() * 200);
  const pressure = parseFloat((0.95 + Math.random() * 0.1).toFixed(2));

  return {
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
};

// Individual AI Analysis
exports.analyzeIndividual = catchAsync(async (req, res, next) => {
  const {
    metalGrade,
    deviationElements = [],
    deviationPercentage = 10,
  } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  // Generate synthetic reading
  const syntheticReading = await generateSyntheticReading(
    metalGrade,
    deviationElements,
    deviationPercentage,
  );

  // Call AI service with individual endpoints
  const aiAnalysis = await aiService.analyzeIndividual(
    syntheticReading.metalGrade,
    syntheticReading.composition,
  );

  // Build combined response
  const response = {
    syntheticReading,
    aiAnalysis: {
      mode: 'individual',
      anomalyDetection: aiAnalysis.anomaly,
      alloyRecommendation: aiAnalysis.alloy,
      serviceAvailable: aiAnalysis.success,
    },
  };

  if (!aiAnalysis.success) {
    response.aiAnalysis.errors = aiAnalysis.errors;
    response.aiAnalysis.warning =
      'AI service experienced errors. Results may be incomplete.';
  }

  res.status(200).json({
    status: 'success',
    data: response,
  });
});

// Agent-Based AI Analysis
exports.analyzeWithAgent = catchAsync(async (req, res, next) => {
  const {
    metalGrade,
    deviationElements = [],
    deviationPercentage = 10,
  } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  // Generate synthetic reading
  const syntheticReading = await generateSyntheticReading(
    metalGrade,
    deviationElements,
    deviationPercentage,
  );

  // Call AI service with agent endpoint
  const agentResult = await aiService.analyzeWithAgent(
    syntheticReading.metalGrade,
    syntheticReading.composition,
  );

  // Build combined response
  const response = {
    syntheticReading,
    aiAnalysis: {
      mode: 'agent',
      agentResponse: agentResult.success
        ? agentResult.data
        : agentResult.fallback,
      serviceAvailable: agentResult.success,
    },
  };

  if (!agentResult.success) {
    response.aiAnalysis.error = agentResult.error;
    response.aiAnalysis.warning =
      'AI agent service unavailable. Using fallback response.';
  }

  res.status(200).json({
    status: 'success',
    data: response,
  });
});

// AI Service Health Check
exports.getAIServiceHealth = catchAsync(async (req, res, next) => {
  const healthStatus = await aiService.healthCheck();

  res.status(healthStatus.success ? 200 : 503).json({
    status: healthStatus.success ? 'success' : 'error',
    data: {
      aiService: healthStatus.success ? healthStatus.data : healthStatus.error,
      baseURL: aiService.baseURL,
      timestamp: new Date(),
    },
  });
});
