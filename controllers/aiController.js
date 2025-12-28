const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const aiService = require('../services/aiService');
const geminiService = require('../services/geminiService');
const GradeSpec = require('../models/gradeSpecModel');
const TrainingData = require('../models/trainingDataModel');

// Anomaly Prediction
// Frontend passes composition data (can be from /api/v2/synthetic/generate-synthetic or real spectrometer)
exports.predictAnomaly = catchAsync(async (req, res, next) => {
  const { grade, composition } = req.body;

  if (!grade) {
    return next(new AppError('Grade is required', 400));
  }

  if (!composition) {
    return next(new AppError('Composition is required', 400));
  }

  // Call AI service for anomaly prediction
  const result = await aiService.predictAnomaly(grade, composition);

  if (!result.success) {
    return next(new AppError(result.error || 'AI service unavailable', 503));
  }

  res.status(200).json({
    status: 'success',
    data: result.data,
  });
});

// Individual AI Analysis
// Frontend passes pre-generated synthetic data from /api/v2/synthetic/generate-synthetic
exports.analyzeIndividual = catchAsync(async (req, res, next) => {
  const { metalGrade, composition } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  if (!composition) {
    return next(
      new AppError(
        'Composition data is required. Generate it first using /api/v2/synthetic/generate-synthetic',
        400,
      ),
    );
  }

  // Validate composition has required elements
  const requiredElements = ['Fe', 'C', 'Si', 'Mn', 'P', 'S'];
  const missingElements = requiredElements.filter(
    (el) => composition[el] === undefined,
  );

  if (missingElements.length > 0) {
    return next(
      new AppError(
        `Missing composition elements: ${missingElements.join(', ')}`,
        400,
      ),
    );
  }

  // Call AI service with the composition data passed from frontend
  const aiAnalysis = await aiService.analyzeIndividual(
    metalGrade.toUpperCase(),
    composition,
  );

  // Build response
  const response = {
    metalGrade: metalGrade.toUpperCase(),
    composition,
    aiAnalysis: {
      mode: 'individual',
      anomalyDetection: aiAnalysis.anomaly,
      alloyRecommendation: aiAnalysis.alloy,
      serviceAvailable: aiAnalysis.success,
    },
    timestamp: new Date(),
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
// Frontend passes pre-generated synthetic data from /api/v2/synthetic/generate-synthetic
exports.analyzeWithAgent = catchAsync(async (req, res, next) => {
  const { metalGrade, composition } = req.body;

  if (!metalGrade) {
    return next(new AppError('Metal grade is required', 400));
  }

  if (!composition) {
    return next(
      new AppError(
        'Composition data is required. Generate it first using /api/v2/synthetic/generate-synthetic',
        400,
      ),
    );
  }

  // Validate composition has required elements
  const requiredElements = ['Fe', 'C', 'Si', 'Mn', 'P', 'S'];
  const missingElements = requiredElements.filter(
    (el) => composition[el] === undefined,
  );

  if (missingElements.length > 0) {
    return next(
      new AppError(
        `Missing composition elements: ${missingElements.join(', ')}`,
        400,
      ),
    );
  }

  // Call AI service with the composition data passed from frontend
  const agentResult = await aiService.analyzeWithAgent(
    metalGrade.toUpperCase(),
    composition,
  );

  // Build response
  const response = {
    metalGrade: metalGrade.toUpperCase(),
    composition,
    aiAnalysis: {
      mode: 'agent',
      agentResponse: agentResult.success
        ? agentResult.data
        : agentResult.fallback,
      serviceAvailable: agentResult.success,
    },
    timestamp: new Date(),
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

// ============================================
// GEMINI AI EXPLANATION ENDPOINTS
// ============================================

/**
 * Get comprehensive explanation from Gemini AI
 * This endpoint takes ML predictions and generates operator-friendly explanations
 */
exports.explainAnalysis = catchAsync(async (req, res, next) => {
  const {
    metalGrade,
    composition,
    anomalyResult,
    alloyResult,
    batchContext = {},
  } = req.body;

  // Validate required fields
  if (!metalGrade || !composition || !anomalyResult || !alloyResult) {
    return next(
      new AppError(
        'Missing required fields: metalGrade, composition, anomalyResult, alloyResult',
        400,
      ),
    );
  }

  // Fetch grade specification
  const gradeSpec = await GradeSpec.findOne({
    grade: metalGrade.toUpperCase(),
  });

  if (!gradeSpec) {
    return next(
      new AppError(`Grade specification for '${metalGrade}' not found`, 404),
    );
  }

  // Validate safety constraints
  const safetyCheck = geminiService.validateSafetyConstraints(
    alloyResult.recommended_additions || {},
  );

  // Prepare analysis data for Gemini
  const analysisData = {
    composition,
    targetGrade: metalGrade.toUpperCase(),
    gradeSpec,
    anomalyResult: {
      is_anomaly: anomalyResult.is_anomaly,
      severity: anomalyResult.severity,
      anomaly_score: anomalyResult.anomaly_score,
      confidence: anomalyResult.confidence,
    },
    alloyResult: {
      recommended_additions: alloyResult.recommended_additions || {},
      confidence: alloyResult.confidence,
    },
    batchContext: {
      batch_id: batchContext.batch_id || `BATCH-${Date.now()}`,
      furnace_temp: batchContext.furnace_temp || null,
      melt_time_minutes: batchContext.melt_time_minutes || null,
    },
  };

  // Determine explanation type
  const explanationType = anomalyResult.is_anomaly ? 'comprehensive' : 'normal';

  // Generate explanation using Gemini
  const explanation = await geminiService.generateExplanation(
    analysisData,
    explanationType,
  );

  // Build response
  const response = {
    status: explanation.success ? 'success' : 'warning',
    data: {
      mlPredictions: {
        anomaly: anomalyResult,
        alloyRecommendation: alloyResult,
      },
      gradeSpecification: {
        grade: gradeSpec.grade,
        standard: gradeSpec.standard,
        composition_ranges: gradeSpec.composition_ranges,
      },
      geminiExplanation: explanation.success
        ? explanation.data
        : explanation.fallback,
      safetyCheck,
      batchContext: analysisData.batchContext,
    },
  };

  if (!explanation.success) {
    response.warning = explanation.error;
    response.message =
      'AI explanation unavailable. Showing ML predictions only.';
  }

  res.status(200).json(response);
});

/**
 * Complete analysis with explanation
 * Generates synthetic reading, runs ML analysis, and provides Gemini explanation
 */
exports.analyzeWithExplanation = catchAsync(async (req, res, next) => {
  const {
    metalGrade,
    deviationElements = [],
    deviationPercentage = 10,
    batchContext = {},
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

  // Run ML analysis (individual mode)
  const mlAnalysis = await aiService.analyzeIndividual(
    syntheticReading.metalGrade,
    syntheticReading.composition,
  );

  // Fetch grade specification
  const gradeSpec = await GradeSpec.findOne({
    grade: metalGrade.toUpperCase(),
  });

  if (!gradeSpec) {
    return next(
      new AppError(`Grade specification for '${metalGrade}' not found`, 404),
    );
  }

  // Prepare analysis data
  const analysisData = {
    composition: syntheticReading.composition,
    targetGrade: metalGrade.toUpperCase(),
    gradeSpec,
    anomalyResult: {
      is_anomaly: mlAnalysis.anomaly.is_anomaly,
      severity: mlAnalysis.anomaly.severity,
      anomaly_score: mlAnalysis.anomaly.anomaly_score,
      confidence: mlAnalysis.anomaly.confidence,
    },
    alloyResult: {
      recommended_additions: mlAnalysis.alloy.recommended_additions || {},
      confidence: mlAnalysis.alloy.confidence,
    },
    batchContext: {
      batch_id:
        batchContext.batch_id ||
        syntheticReading.timestamp.getTime().toString(),
      furnace_temp: syntheticReading.temperature,
      melt_time_minutes: batchContext.melt_time_minutes || 45,
    },
  };

  // Validate safety
  const safetyCheck = geminiService.validateSafetyConstraints(
    mlAnalysis.alloy.recommended_additions || {},
  );

  // Generate explanation
  const explanationType = mlAnalysis.anomaly.is_anomaly
    ? 'comprehensive'
    : 'normal';
  const explanation = await geminiService.generateExplanation(
    analysisData,
    explanationType,
  );

  // Build comprehensive response
  res.status(200).json({
    status: 'success',
    data: {
      syntheticReading: {
        composition: syntheticReading.composition,
        temperature: syntheticReading.temperature,
        pressure: syntheticReading.pressure,
        deviations: syntheticReading.appliedDeviations,
      },
      mlAnalysis: {
        anomaly: mlAnalysis.anomaly,
        alloyRecommendation: mlAnalysis.alloy,
        serviceAvailable: mlAnalysis.success,
      },
      gradeSpecification: {
        grade: gradeSpec.grade,
        standard: gradeSpec.standard,
        composition_ranges: gradeSpec.composition_ranges,
      },
      geminiExplanation: explanation.success
        ? explanation.data
        : explanation.fallback,
      safetyCheck,
      batchContext: analysisData.batchContext,
    },
  });
});

/**
 * What-if analysis endpoint
 * Allows operators to ask questions about alternative actions
 */
exports.whatIfAnalysis = catchAsync(async (req, res, next) => {
  const { metalGrade, composition, alloyResult, userQuestion } = req.body;

  // Validate required fields
  if (!metalGrade || !composition || !alloyResult || !userQuestion) {
    return next(
      new AppError(
        'Missing required fields: metalGrade, composition, alloyResult, userQuestion',
        400,
      ),
    );
  }

  // Prepare analysis data
  const analysisData = {
    composition,
    targetGrade: metalGrade.toUpperCase(),
    alloyResult: {
      recommended_additions: alloyResult.recommended_additions || {},
      confidence: alloyResult.confidence,
    },
  };

  // Generate what-if analysis
  const whatIfResult = await geminiService.generateWhatIfAnalysis(
    analysisData,
    userQuestion,
  );

  res.status(200).json({
    status: whatIfResult.success ? 'success' : 'error',
    data: whatIfResult.success ? whatIfResult.data : null,
    error: whatIfResult.success ? null : whatIfResult.error,
  });
});

/**
 * Get Gemini service health status
 */
exports.getGeminiHealth = catchAsync(async (req, res, next) => {
  const isAvailable = geminiService.isAvailable();
  const isTTSAvailable = geminiService.isTTSAvailable();

  res.status(isAvailable ? 200 : 503).json({
    status: isAvailable ? 'success' : 'error',
    data: {
      aiService: isAvailable ? 'available' : 'not configured',
      ttsService: isTTSAvailable ? 'available' : 'not configured',
      message: isAvailable
        ? 'AI explanation service is ready'
        : 'GOOGLE_GEMINI_API_KEY not set in environment',
      ttsMessage: isTTSAvailable
        ? 'Text-to-speech is enabled'
        : 'ELEVENLABS_API_KEY not set - audio generation disabled',
      model: 'llama-3.3-70b-versatile (Groq)',
      ttsVoice: 'Rachel (ElevenLabs)',
      timestamp: new Date().toISOString(),
    },
  });
});
