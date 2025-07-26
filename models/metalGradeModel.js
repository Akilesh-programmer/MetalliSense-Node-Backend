const mongoose = require('mongoose');

// Custom validator for composition range
const validateCompositionRange = function (value) {
  // Check if it's a Map or Object
  const entries =
    value instanceof Map ? Array.from(value.entries()) : Object.entries(value);

  for (const [element, range] of entries) {
    // Check if range is array of exactly 2 numbers
    if (!Array.isArray(range) || range.length !== 2) {
      return false;
    }

    // Check if both values are numbers
    if (typeof range[0] !== 'number' || typeof range[1] !== 'number') {
      return false;
    }

    // Check if min < max
    if (range[0] > range[1]) {
      return false;
    }
  }
  return true;
};

const metalGradeSpecSchema = new mongoose.Schema(
  {
    metal_grade: {
      type: String,
      required: [true, 'Metal grade name is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    composition_range: {
      type: Map,
      of: [Number], // Array of exactly 2 numbers [min, max]
      required: [true, 'Composition range is required'],
      validate: {
        validator: validateCompositionRange,
        message:
          'Each element must have exactly 2 numbers [min, max] where min < max',
      },
    },
  },
  {
    collection: 'metal_grade_specs',
    timestamps: true,
  },
);

// Index for faster searches
metalGradeSpecSchema.index({ metal_grade: 1 });

// Instance method to check if composition is within specs
metalGradeSpecSchema.methods.isWithinSpecs = function (actualComposition) {
  const results = {};

  for (const [element, range] of this.composition_range.entries()) {
    const actualValue = actualComposition[element];
    if (actualValue !== undefined) {
      results[element] = {
        actual: actualValue,
        range: range,
        withinRange: actualValue >= range[0] && actualValue <= range[1],
      };
    }
  }

  return results;
};

// Static method to get all grade names
metalGradeSpecSchema.statics.getGradeNames = function () {
  return this.find({}, 'metal_grade').sort('metal_grade');
};

const MetalGradeSpec = mongoose.model('MetalGradeSpec', metalGradeSpecSchema);

module.exports = MetalGradeSpec;
