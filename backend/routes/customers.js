const express = require('express');
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');

const router = express.Router();

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      customers
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting customers'
    });
  }
});

// @route   GET /api/customers/:id
// @desc    Get customer by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting customer'
    });
  }
});

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', [
  body('name').isLength({ min: 2 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').isLength({ min: 10 }).trim()
], async (req, res) => {
  try {
    console.log('📝 Creating new customer...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    console.log('✅ Validation passed');

    // Check if customer already exists
    console.log('🔍 Checking for existing customer with email:', req.body.email);
    const existingCustomer = await Customer.findOne({ email: req.body.email });
    if (existingCustomer) {
      console.log('❌ Customer already exists with email:', req.body.email);
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }

    console.log('✅ Email is unique');

    // Create customer object with all fields
    const customerData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address || '',
      status: req.body.status || 'pending',
      avatar: req.body.avatar || '👤',
      role: req.body.role || 'Customer',
      mac: req.body.mac || '',
      box: req.body.box || '',
      startDate: req.body.startDate || '',
      paymentDate: req.body.paymentDate || '',
      paymentMode: req.body.paymentMode || 'Other',
      amount: req.body.amount || '0.00',
      expiryDate: req.body.expiryDate || '',
      totalCredit: req.body.totalCredit || '0.00',
      alreadyGiven: req.body.alreadyGiven || '0.00',
      remainingCredits: req.body.remainingCredits || '0.00',
      note: req.body.note || '',
      serviceDuration: req.body.serviceDuration || ''
    };

    console.log('📦 Customer data to save:', JSON.stringify(customerData, null, 2));

    const customer = new Customer(customerData);
    
    console.log('💾 Saving customer to database...');
    await customer.save();
    
    console.log('✅ Customer saved successfully with ID:', customer._id);

    res.status(201).json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('❌ Create customer error details:');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    
    // Check for specific MongoDB errors
    if (error.name === 'ValidationError') {
      console.error('🔍 Validation error details:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    if (error.code === 11000) {
      console.error('🔍 Duplicate key error:', error.keyValue);
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error creating customer',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', [
  body('name').optional().isLength({ min: 2 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isLength({ min: 10 }).trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating customer'
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting customer'
    });
  }
});

// @route   POST /api/customers/seed
// @desc    Seed sample customers
// @access  Public (for development only)
router.post('/seed', async (req, res) => {
  try {
    // Check if customers already exist
    const existingCustomers = await Customer.find();
    if (existingCustomers.length > 0) {
      return res.json({
        success: true,
        message: 'Customers already exist',
        count: existingCustomers.length
      });
    }

    // Sample customers
    const sampleCustomers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St, New York, NY',
        status: 'active',
        avatar: '/images/user/user-02.png',
        role: 'customer',
        mac: 'AA:BB:CC:DD:EE:FF',
        box: 'BOX001',
        startDate: '2024-01-15',
        paymentDate: '2024-01-15',
        paymentMode: 'Credit Card',
        amount: '99.99',
        expiryDate: '2024-12-15',
        totalCredit: '500.00',
        alreadyGiven: '100.00',
        remainingCredits: '400.00',
        note: 'VIP Customer',
        lastLogin: '2024-01-10'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567891',
        address: '456 Oak Ave, Los Angeles, CA',
        status: 'inactive',
        avatar: '/images/user/user-03.png',
        role: 'customer',
        mac: 'BB:CC:DD:EE:FF:AA',
        box: 'BOX002',
        startDate: '2024-02-01',
        paymentDate: '2024-02-01',
        paymentMode: 'PayPal',
        amount: '79.99',
        expiryDate: '2024-11-01',
        totalCredit: '300.00',
        alreadyGiven: '50.00',
        remainingCredits: '250.00',
        note: 'Regular Customer',
        lastLogin: '2024-01-05'
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '+1234567892',
        address: '789 Pine St, Chicago, IL',
        status: 'active',
        avatar: '/images/user/user-04.png',
        role: 'customer',
        mac: 'CC:DD:EE:FF:AA:BB',
        box: 'BOX003',
        startDate: '2024-03-01',
        paymentDate: '2024-03-01',
        paymentMode: 'Bank Transfer',
        amount: '129.99',
        expiryDate: '2025-02-01',
        totalCredit: '800.00',
        alreadyGiven: '200.00',
        remainingCredits: '600.00',
        note: 'Premium Customer',
        lastLogin: '2024-01-12'
      }
    ];

    const customers = await Customer.insertMany(sampleCustomers);

    res.json({
      success: true,
      message: 'Sample customers created successfully',
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Seed customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error seeding customers'
    });
  }
});

module.exports = router;
