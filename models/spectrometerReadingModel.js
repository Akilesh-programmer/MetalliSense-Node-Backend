const mongoose = require('mongoose');

const spectrometerReadingSchema = new mongoose.Schema(
  {
    reading_id: {
      type: String,
      unique: true,
      trim: true,
    },
    metal_grade: {
      type: String,
      required: [true, 'Metal grade is required'],
      trim: true,
      uppercase: true,
    },
    composition: {
      type: Map,
      of: Number, // Element: percentage value
      required: [true, 'Composition data is required'],
      validate: {
        validator: function (value) {
          // Validate that all composition values are positive numbers
          const entries =
            value instanceof Map
              ? Array.from(value.entries())
              : Object.entries(value);
          return entries.every(([element, percentage]) => {
            return typeof percentage === 'number' && percentage >= 0;
          });
        },
        message: 'All composition values must be positive numbers',
      },
    },
    temperature: {
      type: Number,
      min: [0, 'Temperature cannot be negative'],
      max: [3000, 'Temperature cannot exceed 3000°C'],
    },
    pressure: {
      type: Number,
      min: [0, 'Pressure cannot be negative'],
    },
    operator_id: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    is_synthetic: {
      type: Boolean,
      default: true, // Since we're using simulated data initially
    },
    deviation_applied: {
      type: Boolean,
      default: false, // Whether this reading has intentional deviations for AI testing
    },
    deviation_elements: {
      type: [String], // Which elements were intentionally deviated
      default: [],
    },
  },
  {
    collection: 'spectrometer_readings',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better query performance
spectrometerReadingSchema.index({ metal_grade: 1, createdAt: -1 });
spectrometerReadingSchema.index({ reading_id: 1 });
spectrometerReadingSchema.index({ createdAt: -1 });
spectrometerReadingSchema.index({ deviation_applied: 1 });

// Virtual for age of reading (in minutes)
spectrometerReadingSchema.virtual('ageInMinutes').get(function () {
  if (!this.createdAt) {
    return 0; // Return 0 if createdAt is not available
  }
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
});

// Instance method to get composition as object (for easier frontend consumption)
spectrometerReadingSchema.methods.getCompositionObject = function () {
  return Object.fromEntries(this.composition);
};

// Static method to generate synthetic reading with deviations
spectrometerReadingSchema.statics.generateSyntheticReading = async function (
  metalGrade,
  deviationElements = [],
  deviationPercentage = 10,
) {
  const MetalGradeSpec = require('./metalGradeModel');
  const gradeSpec = await MetalGradeSpec.findOne({
    metal_grade: metalGrade.toUpperCase(),
  });

  if (!gradeSpec) {
    throw new Error(`Metal grade '${metalGrade}' not found in specifications`);
  }

  const composition = {};
  const actualDeviationElements = [];

  // Generate composition based on specifications
  for (const [element, range] of gradeSpec.composition_range.entries()) {
    const [min, max] = range;
    const midpoint = (min + max) / 2;
    const tolerance = (max - min) / 2;

    let value;

    if (deviationElements.includes(element)) {
      // Apply intentional deviation
      const deviationAmount = (tolerance * deviationPercentage) / 100;
      const shouldDeviateUp = Math.random() > 0.5;

      if (shouldDeviateUp) {
        value = max + deviationAmount; // Exceed upper limit
      } else {
        value = min - deviationAmount; // Go below lower limit
      }
      value = Math.max(0, value); // Ensure non-negative
      actualDeviationElements.push(element);
    } else {
      // Generate normal value within range with some random variation
      const variation = (Math.random() - 0.5) * tolerance * 0.8; // Use 80% of tolerance for variation
      value = midpoint + variation;
    }

    composition[element] = Math.round(value * 1000) / 1000; // Round to 3 decimal places
  }

  return {
    metal_grade: metalGrade.toUpperCase(),
    composition: new Map(Object.entries(composition)),
    is_synthetic: true,
    deviation_applied: actualDeviationElements.length > 0,
    deviation_elements: actualDeviationElements,
  };
};

// Pre-save middleware to generate reading_id if not provided
spectrometerReadingSchema.pre('save', function (next) {
  if (!this.reading_id) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '');
    const grade = this.metal_grade.replace(/[^A-Z0-9]/g, '');
    this.reading_id = `READ_${grade}_${timestamp}`;
  }
  next();
});

const SpectrometerReading = mongoose.model(
  'SpectrometerReading',
  spectrometerReadingSchema,
);

module.exports = SpectrometerReading;
