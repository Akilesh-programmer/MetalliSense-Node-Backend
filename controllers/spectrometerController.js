const opcuaClient = require('../services/opcuaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// POST /api/v1/spectrometer/connect
exports.connectToSpectrometer = catchAsync(async (req, res, next) => {
  const result = await opcuaClient.connect();

  // Start subscription for real-time updates
  await opcuaClient.subscribeToReadings();

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      connected: true,
      serverUrl: opcuaClient.serverUrl,
      subscribed: true,
      timestamp: new Date().toISOString(),
    },
  });
});

// POST /api/v1/spectrometer/disconnect
exports.disconnectFromSpectrometer = catchAsync(async (req, res, next) => {
  // Stop subscription first
  await opcuaClient.unsubscribeFromReadings();

  const result = await opcuaClient.disconnect();

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      connected: false,
      subscribed: false,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/v1/spectrometer/latest-reading
exports.getLatestReading = catchAsync(async (req, res, next) => {
  const reading = await opcuaClient.getLatestReading();
  const temperature = await opcuaClient.getTemperature();

  res.status(200).json({
    status: 'success',
    data: {
      reading: reading,
      temperature: temperature,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/v1/spectrometer/status
exports.getStatus = catchAsync(async (req, res, next) => {
  const status = opcuaClient.getConnectionStatus();

  res.status(200).json({
    status: 'success',
    data: status,
  });
});

// PUT /api/v1/spectrometer/config
exports.updateConfiguration = catchAsync(async (req, res, next) => {
  const { metalGrade, incorrectElementsCount } = req.body;

  if (!metalGrade || incorrectElementsCount === undefined) {
    return next(
      new AppError('metalGrade and incorrectElementsCount are required', 400),
    );
  }

  const result = await opcuaClient.updateConfiguration(
    metalGrade,
    incorrectElementsCount,
  );

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      metalGrade,
      incorrectElementsCount,
      timestamp: new Date().toISOString(),
    },
  });
});
