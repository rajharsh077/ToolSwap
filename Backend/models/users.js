const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    required: true
  },

  location: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  profileImage: {
    type: String,
    default: ""
  },

  rating: {
    type: Number,
    default: 0
  },

  numReviews: {
    type: Number,
    default: 0
  },

  isAdmin: {
    type: Boolean,
    default: false
  },

  toolsRequested: [
    {
      tool: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tool'
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'returned'],
        default: 'pending'
      },
      requestDate: {
        type: Date,
        default: Date.now
      },
      returnDate: Date
    }
  ],

  toolsOwned: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool'
  }
],

  toolsLentOut: [
    {
      tool: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tool'
      },
      borrower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['pending', 'approved','rejected', 'returned'],
        default: 'pending'
      },
      lendDate: {
        type: Date,
        default: Date.now
      },
      expectedReturnDate: Date
    }
  ]

}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
