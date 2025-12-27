const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { getFirebaseAuth, getFirebaseAdmin } = require('../config/firebase');
const { syncUserMetadata } = require('../services/userMetadataService');

// Sign up with email and password
exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters', 400));
  }

  try {
    const auth = getFirebaseAuth();

    // Create user in Firebase
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });

    // Create custom token for immediate login
    const customToken = await auth.createCustomToken(userRecord.uid);

    // Sync user metadata to MongoDB (optional)
    try {
      await syncUserMetadata(
        {
          id: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
        },
        req.body.metadata || {},
      );
    } catch (metadataError) {
      console.error('Failed to sync user metadata:', metadataError.message);
    }

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          emailVerified: userRecord.emailVerified,
        },
        customToken,
        message:
          'Account created successfully. Use this token to get ID token from Firebase client.',
      },
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return next(new AppError('Email already in use', 400));
    }
    if (error.code === 'auth/invalid-email') {
      return next(new AppError('Invalid email address', 400));
    }
    if (error.code === 'auth/weak-password') {
      return next(new AppError('Password is too weak', 400));
    }
    return next(new AppError(error.message || 'Signup failed', 500));
  }
});

// Get current user info
exports.getCurrentUser = catchAsync(async (req, res, next) => {
  // User is already attached by protect middleware
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }

  try {
    const auth = getFirebaseAuth();
    const userRecord = await auth.getUser(req.user.uid);

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          emailVerified: userRecord.emailVerified,
          photoURL: userRecord.photoURL,
          createdAt: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        },
      },
    });
  } catch (error) {
    return next(new AppError('Failed to fetch user data', 500));
  }
});

// Update user profile
exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, photoURL } = req.body;

  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }

  try {
    const auth = getFirebaseAuth();
    const updateData = {};

    if (name) updateData.displayName = name;
    if (photoURL) updateData.photoURL = photoURL;

    const userRecord = await auth.updateUser(req.user.uid, updateData);

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          photoURL: userRecord.photoURL,
        },
      },
    });
  } catch (error) {
    return next(new AppError('Failed to update profile', 500));
  }
});

// Delete user account
exports.deleteAccount = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }

  try {
    const auth = getFirebaseAuth();
    await auth.deleteUser(req.user.uid);

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully',
    });
  } catch (error) {
    return next(new AppError('Failed to delete account', 500));
  }
});

// Verify email (send verification email)
exports.sendEmailVerification = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }

  try {
    const auth = getFirebaseAuth();
    const link = await auth.generateEmailVerificationLink(req.user.email);

    res.status(200).json({
      status: 'success',
      data: {
        verificationLink: link,
        message: 'Email verification link generated',
      },
    });
  } catch (error) {
    return next(new AppError('Failed to send verification email', 500));
  }
});

// Send password reset email
exports.sendPasswordResetEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide email address', 400));
  }

  try {
    const auth = getFirebaseAuth();
    const link = await auth.generatePasswordResetLink(email);

    res.status(200).json({
      status: 'success',
      data: {
        resetLink: link,
        message: 'Password reset link generated',
      },
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return next(new AppError('No user found with this email', 404));
    }
    return next(new AppError('Failed to send password reset email', 500));
  }
});

// Set custom claims (for role-based access)
exports.setUserRole = catchAsync(async (req, res, next) => {
  const { uid, role } = req.body;

  if (!uid || !role) {
    return next(new AppError('Please provide uid and role', 400));
  }

  // Only admin can set roles (you should add admin check here)
  try {
    const auth = getFirebaseAuth();
    await auth.setCustomUserClaims(uid, { role });

    res.status(200).json({
      status: 'success',
      message: `Role '${role}' set for user ${uid}`,
    });
  } catch (error) {
    return next(new AppError('Failed to set user role', 500));
  }
});

// Health check for Firebase
exports.authHealthCheck = catchAsync(async (req, res, next) => {
  try {
    const auth = getFirebaseAuth();
    const admin = getFirebaseAdmin();

    res.status(200).json({
      status: 'success',
      message: 'Firebase authentication service is connected',
      config: {
        projectId: admin.app().options.projectId,
        serviceAccount: !!admin.app().options.credential,
      },
    });
  } catch (error) {
    return next(
      new AppError('Firebase authentication service unavailable', 503),
    );
  }
});

// List all users (admin only)
exports.listUsers = catchAsync(async (req, res, next) => {
  const { maxResults = 100, pageToken } = req.query;

  try {
    const auth = getFirebaseAuth();
    const listUsersResult = await auth.listUsers(
      parseInt(maxResults),
      pageToken,
    );

    const users = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pageToken: listUsersResult.pageToken,
      },
    });
  } catch (error) {
    return next(new AppError('Failed to list users', 500));
  }
});
