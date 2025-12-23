const mongoose = require('mongoose');

const gradeSpecSchema = new mongoose.Schema(
  {
    grade: {
      type: String,
      required: [true, 'Grade name is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    standard: {
      type: String,
      required: [true, 'Standard is required'],
    },
    composition_ranges: {
      Fe: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'Fe range must have [min, max] with min < max',
        },
      },
      C: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'C range must have [min, max] with min < max',
        },
      },
      Si: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'Si range must have [min, max] with min < max',
        },
      },
      Mn: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'Mn range must have [min, max] with min < max',
        },
      },
      P: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'P range must have [min, max] with min < max',
        },
      },
      S: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'S range must have [min, max] with min < max',
        },
      },
    },
    physical_properties: {
      tensile_strength_mpa: {
        type: [Number],
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'Tensile strength range must have [min, max] with min < max',
        },
      },
      yield_strength_mpa: {
        type: [Number],
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'Yield strength range must have [min, max] with min < max',
        },
      },
      elongation_percent: {
        type: [Number],
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] < v[1];
          },
          message: 'Elongation range must have [min, max] with min < max',
        },
      },
    },
    typical_applications: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for fast queries
gradeSpecSchema.index({ grade: 1 });

const GradeSpec = mongoose.model('GradeSpec', gradeSpecSchema);

module.exports = GradeSpec;
