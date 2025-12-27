const UserMetadata = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

// Sync or create user metadata in MongoDB after Firebase authentication
exports.syncUserMetadata = async (firebaseUser, additionalData = {}) => {
  try {
    // Find or create user metadata
    let userMetadata = await UserMetadata.findOne({
      firebaseUserId: firebaseUser.id,
    });

    if (!userMetadata) {
      // Create new metadata entry
      userMetadata = await UserMetadata.create({
        firebaseUserId: firebaseUser.id,
        email: firebaseUser.email,
        name: firebaseUser.name,
        role: additionalData.role || 'user',
        preferences: additionalData.preferences || {},
        department: additionalData.department,
        employeeId: additionalData.employeeId,
      });

      console.log(`✓ Created metadata for user: ${firebaseUser.id}`);
    } else {
      // Update last active
      userMetadata.lastActive = Date.now();
      await userMetadata.save();
    }

    return userMetadata;
  } catch (error) {
    console.error('Error syncing user metadata:', error);
    return null;
  }
};

// Get user metadata by Firebase user ID
exports.getUserMetadata = catchAsync(async (req, res, next) => {
  const { firebaseUserId } = req.params;

  const metadata = await UserMetadata.findOne({ firebaseUserId });

  if (!metadata) {
    return res.status(404).json({
      status: 'fail',
      message: 'User metadata not found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: metadata,
  });
});

// Update user metadata
exports.updateUserMetadata = catchAsync(async (req, res, next) => {
  const firebaseUserId = req.user.uid;
  const updates = req.body;

  // Don't allow updating firebaseUserId or email
  delete updates.firebaseUserId;
  delete updates.email;

  const metadata = await UserMetadata.findOneAndUpdate(
    { firebaseUserId },
    { ...updates, lastActive: Date.now() },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(200).json({
    status: 'success',
    data: metadata,
  });
});

// Get user stats
exports.getUserStats = catchAsync(async (req, res, next) => {
  const firebaseUserId = req.user.uid;

  const metadata = await UserMetadata.findOne({ firebaseUserId });

  if (!metadata) {
    return res.status(404).json({
      status: 'fail',
      message: 'User metadata not found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      role: metadata.role,
      department: metadata.department,
      lastActive: metadata.lastActive,
      preferences: metadata.preferences,
    },
  });
});
