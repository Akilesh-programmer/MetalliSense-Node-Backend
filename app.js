const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const metalGradeRouter = require('./routes/metalGradeRoutes');
const spectrometerRouter = require('./routes/spectrometerRoutes');

// V2 Routes
const gradeSpecRouter = require('./routes/gradeSpecRoutes');
const trainingDataRouter = require('./routes/trainingDataRoutes');
const syntheticRouter = require('./routes/syntheticRoutes');
const aiRouter = require('./routes/aiRoutes');

const app = express();

// 1) GLOBAL MIDDLEWARES
// Enable CORS for all routes
app.use(
  cors({
    origin: true, // Allow all origins (for development/testing)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);
app.set('trust proxy', 1);

// Set security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Cookie parser, reading cookies from requests
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// 2) HEALTH CHECK ROUTE
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
  });
});

// 3) ROUTES
app.use('/api/v1/users', userRouter);
app.use('/api/v1/metal-grades', metalGradeRouter);
app.use('/api/v1/spectrometer', spectrometerRouter);

// V2 Routes
app.use('/api/v2/grades', gradeSpecRouter);
app.use('/api/v2/training-data', trainingDataRouter);
app.use('/api/v2/synthetic', syntheticRouter);
app.use('/api/v2/ai', aiRouter);

app.all('/', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
