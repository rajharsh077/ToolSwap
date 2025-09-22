const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    required: true
  },

  image: {
    type: String, // File path or URL
    required: true
  },

  location: {
    type: String,
    required: true
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrowedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
},
borrowedAt: {
    type: Date,
    default: null
  },
  available: {
    type: Boolean,
    default: true
  },

  availabilityDates: [
    {
      type: Date
    }
  ],

}, {
  timestamps: true
});

module.exports = mongoose.model('Tool', toolSchema);
