import mongoose, { Document, Model, Schema } from 'mongoose';

// Customer Interface
export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  role: 'Premium Customer' | 'Standard Customer' | 'Basic Customer';
  status: 'Active' | 'Inactive' | 'Pending';
  avatar?: string;
  
  // Technical Details
  mac: string;
  box: string;
  startDate: string;
  expiryDate: string;
  
  // Payment Details
  paymentDate: string;
  paymentMode: 'Credit Card' | 'Debit Card' | 'PayPal' | 'Bank Transfer' | 'Wire Transfer' | 'Cash';
  amount: string;
  
  // Credit Information
  totalCredit: string;
  alreadyGiven: string;
  remainingCredits: string;
  
  // Additional Info
  note?: string;
  serviceDuration?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Customer Schema
const customerSchema = new Schema<ICustomer>(
  {
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
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    role: {
      type: String,
      enum: ['Premium Customer', 'Standard Customer', 'Basic Customer'],
      default: 'Standard Customer'
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending'],
      default: 'Active'
    },
    avatar: {
      type: String,
      default: null
    },
    
    // Technical Details
    mac: {
      type: String,
      required: [true, 'MAC address is required'],
      unique: true,
      match: [/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Please enter a valid MAC address']
    },
    box: {
      type: String,
      required: [true, 'Box ID is required'],
      unique: true,
      trim: true
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required']
    },
    expiryDate: {
      type: String,
      required: [true, 'Expiry date is required']
    },
    
    // Payment Details
    paymentDate: {
      type: String,
      required: [true, 'Payment date is required']
    },
    paymentMode: {
      type: String,
      enum: ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Wire Transfer', 'Cash'],
      required: [true, 'Payment mode is required']
    },
    amount: {
      type: String,
      required: [true, 'Amount is required']
    },
    
    // Credit Information
    totalCredit: {
      type: String,
      required: [true, 'Total credit is required']
    },
    alreadyGiven: {
      type: String,
      required: [true, 'Already given amount is required']
    },
    remainingCredits: {
      type: String,
      required: [true, 'Remaining credits is required']
    },
    
    // Additional Info
    note: {
      type: String,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    serviceDuration: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      }
    }
  }
);

// Indexes for better performance
customerSchema.index({ email: 1 });
customerSchema.index({ mac: 1 });
customerSchema.index({ box: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ role: 1 });

// Create Customer model
const Customer: Model<ICustomer> = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;
