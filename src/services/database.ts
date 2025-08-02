import connectToDatabase from '../lib/mongodb';
import Admin, { IAdmin } from '../models/Admin';
import Customer, { ICustomer } from '../models/Customer';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = import.meta.env.REACT_APP_JWT_SECRET || 'your-fallback-secret';

// Admin API functions
export const adminAPI = {
  // Create a new admin
  async createAdmin(adminData: Partial<IAdmin>): Promise<IAdmin> {
    await connectToDatabase();
    const admin = new Admin(adminData);
    return await admin.save();
  },

  // Authenticate admin
  async authenticateAdmin(email: string, password: string): Promise<{ admin: IAdmin; token: string } | null> {
    await connectToDatabase();
    const admin = await Admin.findOne({ email, isActive: true }).select('+password');
    
    if (!admin || !(await admin.comparePassword(password))) {
      return null;
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const payload = { 
      id: (admin as any)._id.toString(), 
      email: admin.email, 
      role: admin.role 
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return { admin, token };
  },

  // Get admin by ID
  async getAdminById(id: string): Promise<IAdmin | null> {
    await connectToDatabase();
    return await Admin.findById(id);
  },

  // Get all admins
  async getAllAdmins(): Promise<IAdmin[]> {
    await connectToDatabase();
    return await Admin.find({ isActive: true }).sort({ createdAt: -1 });
  },

  // Update admin
  async updateAdmin(id: string, updateData: Partial<IAdmin>): Promise<IAdmin | null> {
    await connectToDatabase();
    return await Admin.findByIdAndUpdate(id, updateData, { new: true });
  },

  // Delete admin (soft delete)
  async deleteAdmin(id: string): Promise<boolean> {
    await connectToDatabase();
    const result = await Admin.findByIdAndUpdate(id, { isActive: false });
    return !!result;
  },

  // Verify JWT token
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
};

// Customer API functions
export const customerAPI = {
  // Create a new customer
  async createCustomer(customerData: Partial<ICustomer>): Promise<ICustomer> {
    await connectToDatabase();
    const customer = new Customer(customerData);
    return await customer.save();
  },

  // Get customer by ID
  async getCustomerById(id: string): Promise<ICustomer | null> {
    await connectToDatabase();
    return await Customer.findById(id);
  },

  // Get all customers
  async getAllCustomers(page: number = 1, limit: number = 10, filters: any = {}): Promise<{
    customers: ICustomer[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await connectToDatabase();
    
    const skip = (page - 1) * limit;
    const query = Customer.find(filters);
    
    const [customers, total] = await Promise.all([
      query.clone().skip(skip).limit(limit).sort({ createdAt: -1 }),
      Customer.countDocuments(filters)
    ]);

    return {
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  // Update customer
  async updateCustomer(id: string, updateData: Partial<ICustomer>): Promise<ICustomer | null> {
    await connectToDatabase();
    return await Customer.findByIdAndUpdate(id, updateData, { new: true });
  },

  // Delete customer
  async deleteCustomer(id: string): Promise<boolean> {
    await connectToDatabase();
    const result = await Customer.findByIdAndDelete(id);
    return !!result;
  },

  // Search customers
  async searchCustomers(searchTerm: string, page: number = 1, limit: number = 10): Promise<{
    customers: ICustomer[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await connectToDatabase();
    
    const searchRegex = new RegExp(searchTerm, 'i');
    const searchQuery = {
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { mac: searchRegex },
        { box: searchRegex }
      ]
    };

    const skip = (page - 1) * limit;
    
    const [customers, total] = await Promise.all([
      Customer.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Customer.countDocuments(searchQuery)
    ]);

    return {
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  // Get customer statistics
  async getCustomerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    premium: number;
    standard: number;
    basic: number;
  }> {
    await connectToDatabase();
    
    const [total, active, inactive, pending, premium, standard, basic] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'Active' }),
      Customer.countDocuments({ status: 'Inactive' }),
      Customer.countDocuments({ status: 'Pending' }),
      Customer.countDocuments({ role: 'Premium Customer' }),
      Customer.countDocuments({ role: 'Standard Customer' }),
      Customer.countDocuments({ role: 'Basic Customer' })
    ]);

    return { total, active, inactive, pending, premium, standard, basic };
  }
};

// Database seeding function
export const seedDatabase = async () => {
  await connectToDatabase();
  
  // Check if admin exists
  const adminExists = await Admin.findOne({ email: import.meta.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com' });
  
  if (!adminExists) {
    console.log('Creating default admin user...');
    await Admin.create({
      name: 'System Administrator',
      email: import.meta.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com',
      password: import.meta.env.REACT_APP_ADMIN_PASSWORD || 'admin123',
      role: 'super-admin'
    });
    console.log('Default admin user created');
  }
  
  // Check if customers exist
  const customerCount = await Customer.countDocuments();
  
  if (customerCount === 0) {
    console.log('Creating sample customers...');
    
    const sampleCustomers = [
      {
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        role: 'Premium Customer',
        status: 'Active',
        mac: '00:1B:63:84:45:E6',
        box: 'BOX-001',
        startDate: '2024-01-01',
        expiryDate: '2024-12-31',
        paymentDate: '2024-01-15',
        paymentMode: 'Credit Card',
        amount: '$199.99',
        totalCredit: '$1000.00',
        alreadyGiven: '$500.00',
        remainingCredits: '$500.00',
        note: 'Premium customer with excellent payment history.'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '+1 (555) 234-5678',
        role: 'Standard Customer',
        status: 'Active',
        mac: '00:1B:63:84:45:E7',
        box: 'BOX-002',
        startDate: '2024-01-02',
        expiryDate: '2024-12-30',
        paymentDate: '2024-01-14',
        paymentMode: 'PayPal',
        amount: '$99.99',
        totalCredit: '$500.00',
        alreadyGiven: '$200.00',
        remainingCredits: '$300.00',
        note: 'Regular customer, prefers online payments.'
      }
    ];
    
    await Customer.insertMany(sampleCustomers);
    console.log('Sample customers created');
  }
};
