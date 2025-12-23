const mongoose = require('mongoose');

const trainingDataSchema = new mongoose.Schema(
  {
    grade: {
      type: String,
      required: [true, 'Grade is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    Fe: {
      type: Number,
      required: [true, 'Fe composition is required'],
    },
    C: {
      type: Number,
      required: [true, 'C composition is required'],
    },
    Si: {
      type: Number,
      required: [true, 'Si composition is required'],
    },
    Mn: {
      type: Number,
      required: [true, 'Mn composition is required'],
    },
    P: {
      type: Number,
      required: [true, 'P composition is required'],
    },
    S: {
      type: Number,
      required: [true, 'S composition is required'],
    },
    deviated: {
      type: Number,
      required: true,
      enum: [0, 1],
      default: 0,
    },
    severity: {
      type: String,
      required: true,
      enum: ['none', 'mild', 'moderate', 'severe'],
      default: 'none',
    },
    sample_type: {
      type: String,
      required: true,
      enum: ['normal', 'deviated'],
      default: 'normal',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index for fast grade + sample_type queries
trainingDataSchema.index({ grade: 1, sample_type: 1 });
trainingDataSchema.index({ grade: 1, deviated: 1 });

const TrainingData = mongoose.model('TrainingData', trainingDataSchema);

module.exports = TrainingData;
