const TrainingData = require('../models/trainingDataModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Standard CRUD operations using factory
exports.getAllTrainingData = factory.getAll(TrainingData);
exports.getTrainingDataById = factory.getOne(TrainingData);
exports.createTrainingData = factory.createOne(TrainingData);
exports.updateTrainingData = factory.updateOne(TrainingData);
exports.deleteTrainingData = factory.deleteOne(TrainingData);

// Get training data by grade
exports.getTrainingDataByGrade = catchAsync(async (req, res, next) => {
  const { gradeName } = req.params;
  const { sample_type, limit = 100 } = req.query;

  const query = { grade: gradeName.toUpperCase() };
  if (sample_type) {
    query.sample_type = sample_type;
  }

  const data = await TrainingData.find(query).limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: data.length,
    data: { trainingData: data },
  });
});

// Get paginated training data with advanced filtering
exports.getPaginatedTrainingData = catchAsync(async (req, res, next) => {
  // Extract query parameters with defaults
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Build filter object
  const filter = {};

  // Filter by grade
  if (req.query.grade) {
    filter.grade = req.query.grade.toUpperCase();
  }

  // Filter by sample type (normal, deviated)
  if (req.query.sample_type) {
    filter.sample_type = req.query.sample_type;
  }

  // Filter by severity (none, mild, moderate, severe)
  if (req.query.severity) {
    filter.severity = req.query.severity;
  }

  // Filter by deviation status
  if (req.query.deviation_status) {
    filter.deviation_status = req.query.deviation_status;
  }

  // Build sort object (default: newest first)
  const sortBy = req.query.sort || '-createdAt';

  // Execute query with pagination
  const data = await TrainingData.find(filter)
    .sort(sortBy)
    .limit(limit)
    .skip(skip)
    .lean(); // Use lean() for better performance

  // Get total count for pagination metadata
  const totalDocuments = await TrainingData.countDocuments(filter);
  const totalPages = Math.ceil(totalDocuments / limit);

  res.status(200).json({
    status: 'success',
    results: data.length,
    pagination: {
      currentPage: page,
      totalPages,
      totalDocuments,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
    data: {
      trainingData: data,
    },
  });
});

// Get statistics for a grade
exports.getGradeStatistics = catchAsync(async (req, res, next) => {
  const { gradeName } = req.params;

  const stats = await TrainingData.aggregate([
    {
      $match: { grade: gradeName.toUpperCase() },
    },
    {
      $group: {
        _id: '$sample_type',
        count: { $sum: 1 },
        avgFe: { $avg: '$Fe' },
        avgC: { $avg: '$C' },
        avgSi: { $avg: '$Si' },
        avgMn: { $avg: '$Mn' },
        avgP: { $avg: '$P' },
        avgS: { $avg: '$S' },
        minFe: { $min: '$Fe' },
        maxFe: { $max: '$Fe' },
        minC: { $min: '$C' },
        maxC: { $max: '$C' },
        minSi: { $min: '$Si' },
        maxSi: { $max: '$Si' },
        minMn: { $min: '$Mn' },
        maxMn: { $max: '$Mn' },
        minP: { $min: '$P' },
        maxP: { $max: '$P' },
        minS: { $min: '$S' },
        maxS: { $max: '$S' },
      },
    },
  ]);

  if (!stats || stats.length === 0) {
    return next(
      new AppError(`No training data found for grade '${gradeName}'`, 404),
    );
  }

  res.status(200).json({
    status: 'success',
    data: { grade: gradeName.toUpperCase(), statistics: stats },
  });
});

// Get visualization data for charts and analytics
exports.getVisualizationData = catchAsync(async (req, res, next) => {
  // 1. Grade Distribution (for Pie Chart)
  const gradeDistribution = await TrainingData.aggregate([
    {
      $group: {
        _id: '$grade',
        total: { $sum: 1 },
        normal: {
          $sum: { $cond: [{ $eq: ['$sample_type', 'normal'] }, 1, 0] },
        },
        deviated: {
          $sum: { $cond: [{ $eq: ['$sample_type', 'deviated'] }, 1, 0] },
        },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);

  // 2. Sample Type Distribution (for Pie Chart)
  const sampleTypeDistribution = await TrainingData.aggregate([
    {
      $group: {
        _id: '$sample_type',
        count: { $sum: 1 },
      },
    },
  ]);

  // 3. Severity Distribution (for Pie Chart)
  const severityDistribution = await TrainingData.aggregate([
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // 4. Grade-wise Sample Type Breakdown (for Stacked Bar Chart)
  const gradeTypeBreakdown = await TrainingData.aggregate([
    {
      $group: {
        _id: {
          grade: '$grade',
          sample_type: '$sample_type',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.grade',
        data: {
          $push: {
            sample_type: '$_id.sample_type',
            count: '$count',
          },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // 5. Composition Statistics by Grade (for Box Plot / Range Chart)
  const compositionByGrade = await TrainingData.aggregate([
    {
      $group: {
        _id: '$grade',
        // Iron (Fe)
        avgFe: { $avg: '$Fe' },
        minFe: { $min: '$Fe' },
        maxFe: { $max: '$Fe' },
        // Carbon (C)
        avgC: { $avg: '$C' },
        minC: { $min: '$C' },
        maxC: { $max: '$C' },
        // Silicon (Si)
        avgSi: { $avg: '$Si' },
        minSi: { $min: '$Si' },
        maxSi: { $max: '$Si' },
        // Manganese (Mn)
        avgMn: { $avg: '$Mn' },
        minMn: { $min: '$Mn' },
        maxMn: { $max: '$Mn' },
        // Phosphorus (P)
        avgP: { $avg: '$P' },
        minP: { $min: '$P' },
        maxP: { $max: '$P' },
        // Sulfur (S)
        avgS: { $avg: '$S' },
        minS: { $min: '$S' },
        maxS: { $max: '$S' },
        totalSamples: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // 6. Severity by Grade (for Heatmap or Grouped Bar Chart)
  const severityByGrade = await TrainingData.aggregate([
    {
      $group: {
        _id: {
          grade: '$grade',
          severity: '$severity',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.grade',
        severities: {
          $push: {
            severity: '$_id.severity',
            count: '$count',
          },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // 7. Element Distribution Histograms (for specific grade if provided)
  const gradeFilter = req.query.grade
    ? { grade: req.query.grade.toUpperCase() }
    : {};

  const elementDistributions = await TrainingData.aggregate([
    { $match: gradeFilter },
    {
      $facet: {
        Fe: [
          {
            $bucket: {
              groupBy: '$Fe',
              boundaries: [0, 70, 75, 80, 85, 90, 95, 100],
              default: 'Other',
              output: { count: { $sum: 1 } },
            },
          },
        ],
        C: [
          {
            $bucket: {
              groupBy: '$C',
              boundaries: [0, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0],
              default: 'Other',
              output: { count: { $sum: 1 } },
            },
          },
        ],
        Si: [
          {
            $bucket: {
              groupBy: '$Si',
              boundaries: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0],
              default: 'Other',
              output: { count: { $sum: 1 } },
            },
          },
        ],
      },
    },
  ]);

  // 8. Overall Statistics
  const overallStats = await TrainingData.aggregate([
    {
      $group: {
        _id: null,
        totalSamples: { $sum: 1 },
        normalSamples: {
          $sum: { $cond: [{ $eq: ['$sample_type', 'normal'] }, 1, 0] },
        },
        deviatedSamples: {
          $sum: { $cond: [{ $eq: ['$sample_type', 'deviated'] }, 1, 0] },
        },
        severityNone: {
          $sum: { $cond: [{ $eq: ['$severity', 'none'] }, 1, 0] },
        },
        severityMild: {
          $sum: { $cond: [{ $eq: ['$severity', 'mild'] }, 1, 0] },
        },
        severityModerate: {
          $sum: { $cond: [{ $eq: ['$severity', 'moderate'] }, 1, 0] },
        },
        severitySevere: {
          $sum: { $cond: [{ $eq: ['$severity', 'severe'] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      overview: overallStats[0] || {},
      gradeDistribution,
      sampleTypeDistribution,
      severityDistribution,
      gradeTypeBreakdown,
      compositionByGrade,
      severityByGrade,
      elementDistributions: elementDistributions[0] || {},
    },
  });
});
