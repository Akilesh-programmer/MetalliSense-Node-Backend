const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { getFirebaseAuth } = require('../config/firebase');

// Middleware to protect routes - requires valid Firebase authentication
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token from Authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }

  // 2) Verify token with Firebase
  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // 3) Attach user to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      emailVerified: decodedToken.email_verified,
      picture: decodedToken.picture,
    };

    next();
  } catch (error) {
    return next(
      new AppError('Invalid or expired token. Please log in again.', 401),
    );
  }
});

// Middleware to optionally authenticate - doesn't fail if no token
exports.optionalAuth = catchAsync(async (req, res, next) => {
  // 1) Get token from Authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token, continue without authentication
  if (!token) {
    return next();
  }

  // 2) Try to verify token with Firebase
  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      emailVerified: decodedToken.email_verified,
      picture: decodedToken.picture,
    };
  } catch (error) {
    // Token invalid but continue anyway
    console.log('Optional auth failed:', error.message);
  }

  next();
});

// Middleware to restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    // Check if user has required role in custom claims
    const userRole = req.user.role || 'user';

    if (!roles.includes(userRole)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
};
