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
  lat: Number,
  lng: Number,
  address: String
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
  returnRequested: {
    type: Boolean,
    default: false
  },

  returnRequestedAt: {
    type: Date,
    default: null
  },

  available: {
    type: Boolean,
    default: true
  },

  isFlagged: {
    type: Boolean,
    default: false
  },

  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  flagReason: {
    type: String,
    default: ""
  },

  flaggedAt: {
    type: Date,
    default: null
  },

  borrowerFlagged: {
    type: Boolean,
    default: false
  },

  borrowerFlaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  borrowerFlagReason: {
    type: String,
    default: ""
  },

  borrowerFlaggedAt: {
    type: Date,
    default: null
  },

  reportedBorrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  availabilityDates: [
    {
      type: Date
    }
  ],

  bookingStartDate: {
    type: Date,
    default: null
  },

  bookingEndDate: {
    type: Date,
    default: null
  },

  pickupTime: {
    type: String,
    default: ""
  },

  returnDeadline: {
    type: String,
    default: ""
  },

  borrowCount: {
    type: Number,
    default: 0
  },
  condition: {
    type: String,
    default: "Good Condition"
  },

  reviews: [
    {
      borrower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

}, {
  timestamps: true
});

module.exports = mongoose.model('Tool', toolSchema);
