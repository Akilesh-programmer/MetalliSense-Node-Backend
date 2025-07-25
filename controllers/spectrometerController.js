const spectrometerClient = require('../services/spectrometerClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// POST /api/v1/spectrometer/connect
exports.connectToSpectrometer = catchAsync(async (req, res, next) => {
  const result = await spectrometerClient.connect();

  // MQTT automatically subscribes to readings on connect
  // Start subscription for real-time updates (compatibility method)
  try {
    await spectrometerClient.subscribeToReadings();
  } catch (subscriptionError) {
    console.warn('⚠️ Subscription warning:', subscriptionError.message);
  }

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      connected: result.success,
      offline: result.offline || false,
      brokerUrl: spectrometerClient.brokerUrl,
      subscribed: result.success,
      timestamp: new Date().toISOString(),
    },
  });
});

// POST /api/v1/spectrometer/disconnect
exports.disconnectFromSpectrometer = catchAsync(async (req, res, next) => {
  // Stop subscription first (compatibility method)
  await spectrometerClient.unsubscribeFromReadings();

  const result = await spectrometerClient.disconnect();

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
  const reading = await spectrometerClient.getLatestReading();
  const temperature = await spectrometerClient.getTemperature();

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
  const status = spectrometerClient.getConnectionStatus();

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

  const result = await spectrometerClient.updateConfiguration(
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

// POST /api/v1/spectrometer/generate-reading
exports.generateReading = catchAsync(async (req, res, next) => {
  const result = await spectrometerClient.generateReading();

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/v1/spectrometer/config
exports.getCurrentConfig = catchAsync(async (req, res, next) => {
  const config = spectrometerClient.getCurrentConfig();

  res.status(200).json({
    status: 'success',
    data: config,
  });
});
