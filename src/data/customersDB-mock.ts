// Mock customer service for frontend demo
// This simulates database operations using localStorage

// Customer interface
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive' | 'pending';
  avatar: string;
  role: string;
  mac: string;
  box: string;
  startDate: string;
  paymentDate: string;
  paymentMode: string;
  amount: string;
  expiryDate: string;
  totalCredit: string;
  alreadyGiven: string;
  remainingCredits: string;
  note: string;
  lastLogin: string;
}

// Mock customers data - stored in localStorage
const STORAGE_KEY = 'demo_customers';

// Initialize mock data
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
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

// Helper function to get customers from localStorage
const getStoredCustomers = (): Customer[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with mock data if none exists
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_CUSTOMERS));
    return MOCK_CUSTOMERS;
  } catch (error) {
    console.error('Error getting stored customers:', error);
    return MOCK_CUSTOMERS;
  }
};

// Helper function to save customers to localStorage
const saveCustomers = (customers: Customer[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch (error) {
    console.error('Error saving customers:', error);
  }
};

// Get all customers
export const getAllCustomers = async (): Promise<Customer[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getStoredCustomers());
    }, 100); // Simulate async delay
  });
};

// Get customer by ID
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const customers = getStoredCustomers();
      const customer = customers.find(c => c.id === id);
      resolve(customer || null);
    }, 100); // Simulate async delay
  });
};

// Create new customer
export const createCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const customers = getStoredCustomers();
      const newCustomer: Customer = {
        ...customerData,
        id: Date.now().toString() // Simple ID generation
      };
      customers.push(newCustomer);
      saveCustomers(customers);
      resolve(newCustomer);
    }, 100); // Simulate async delay
  });
};

// Update customer
export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const customers = getStoredCustomers();
      const index = customers.findIndex(c => c.id === id);
      
      if (index === -1) {
        resolve(null);
        return;
      }
      
      customers[index] = { ...customers[index], ...updates };
      saveCustomers(customers);
      resolve(customers[index]);
    }, 100); // Simulate async delay
  });
};

// Delete customer
export const deleteCustomer = async (id: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const customers = getStoredCustomers();
      const index = customers.findIndex(c => c.id === id);
      
      if (index === -1) {
        resolve(false);
        return;
      }
      
      customers.splice(index, 1);
      saveCustomers(customers);
      resolve(true);
    }, 100); // Simulate async delay
  });
};
