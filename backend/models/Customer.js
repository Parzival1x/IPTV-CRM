const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  avatar: {
    type: String,
    default: '/images/user/user-02.png'
  },
  role: {
    type: String,
    default: 'customer'
  },
  mac: {
    type: String,
    trim: true,
    default: ''
  },
  box: {
    type: String,
    trim: true,
    default: ''
  },
  startDate: {
    type: String,
    default: ''
  },
  paymentDate: {
    type: String,
    default: ''
  },
  paymentMode: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Cash', 'Other'],
    default: 'Other'
  },
  amount: {
    type: String,
    default: '0.00'
  },
  expiryDate: {
    type: String,
    default: ''
  },
  totalCredit: {
    type: String,
    default: '0.00'
  },
  alreadyGiven: {
    type: String,
    default: '0.00'
  },
  remainingCredits: {
    type: String,
    default: '0.00'
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  serviceDuration: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
CustomerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Transform JSON output
CustomerSchema.methods.toJSON = function() {
  const customerObject = this.toObject();
  customerObject.id = customerObject._id;
  delete customerObject._id;
  delete customerObject.__v;
  return customerObject;
};

module.exports = mongoose.model('Customer', CustomerSchema);
