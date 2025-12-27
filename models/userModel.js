const mongoose = require('mongoose');
const validator = require('validator');

// UserMetadata schema for storing additional user data in MongoDB
// Firebase handles authentication, this stores app-specific metadata
const userMetadataSchema = new mongoose.Schema(
  {
    firebaseUserId: {
      type: String,
      required: [true, 'Firebase user ID is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    name: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'operator', 'supervisor'],
      default: 'user',
    },
    department: {
      type: String,
    },
    employeeId: {
      type: String,
    },
    preferences: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
userMetadataSchema.index({ email: 1 });
userMetadataSchema.index({ lastActive: -1 });

const UserMetadata = mongoose.model('UserMetadata', userMetadataSchema);

module.exports = UserMetadata;
