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
