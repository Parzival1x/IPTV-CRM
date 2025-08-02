import { customersAPI } from '../services/api';
import { formatCreditAmount } from '../utils/creditFormatter';

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
  serviceDuration: string;
}

// Calculate credits based on payment amount, service price, and service duration
export const calculateCustomerCredits = (
  paymentAmount: number,
  servicePrice: number,
  paymentDate: string,
  serviceDuration: number
): { totalCredit: string; alreadyGiven: string; remainingCredits: string; expiryDate: string } => {
  const totalCredit = paymentAmount;
  
  // Calculate how many months have passed since payment date
  const paymentDateObj = new Date(paymentDate);
  const currentDate = new Date();
  const monthsPassed = Math.floor((currentDate.getTime() - paymentDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const actualMonthsPassed = Math.max(0, Math.min(monthsPassed, serviceDuration));
  
  const alreadyGiven = servicePrice * actualMonthsPassed;
  const remainingCredits = Math.max(0, totalCredit - alreadyGiven);
  
  // Calculate expiry date
  const expiryDate = new Date(paymentDateObj);
  expiryDate.setMonth(expiryDate.getMonth() + serviceDuration);
  
  return {
    totalCredit: formatCreditAmount(totalCredit),
    alreadyGiven: formatCreditAmount(alreadyGiven),
    remainingCredits: formatCreditAmount(remainingCredits),
    expiryDate: expiryDate.toISOString().split('T')[0]
  };
}

// Recalculate credits when payment date changes
export const recalculateCreditsOnPaymentDateChange = (
  customer: Customer,
  newPaymentDate: string,
  servicePrice: number = 25 // Default service price
): { alreadyGiven: string; remainingCredits: string; expiryDate: string } => {
  const paymentAmount = parseFloat(customer.amount) || 0;
  const serviceDuration = parseInt(customer.serviceDuration) || 12;
  
  // Calculate new credits with updated payment date
  const newCredits = calculateCustomerCredits(
    paymentAmount,
    servicePrice,
    newPaymentDate,
    serviceDuration
  );
  
  return {
    alreadyGiven: newCredits.alreadyGiven,
    remainingCredits: newCredits.remainingCredits,
    expiryDate: newCredits.expiryDate
  };
};

// Get all customers
export const getAllCustomers = async (): Promise<Customer[]> => {
  try {
    const response = await customersAPI.getAll();
    return response.customers || [];
  } catch (error) {
    console.error('Error getting customers:', error);
    return [];
  }
};

// Get customer by ID
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const response = await customersAPI.getById(id);
    return response.customer || null;
  } catch (error) {
    console.error('Error getting customer from API:', error);
    
    // Fallback to mock data if API is not available
    const mockCustomer: Customer = {
      id: id,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      address: '123 Main St, Anytown, USA',
      status: 'active',
      avatar: '/images/user/user-02.png',
      role: 'customer',
      mac: '00:11:22:33:44:55',
      box: 'STB-12345',
      startDate: '2024-01-15',
      paymentDate: '2024-01-15',
      paymentMode: 'Credit Card',
      amount: '500.00',
      expiryDate: '2025-01-15',
      totalCredit: '500.00',
      alreadyGiven: '125.00',
      remainingCredits: '375.00',
      note: 'Premium customer with excellent payment history.',
      serviceDuration: '12'
    };
    return mockCustomer;
  }
};

// Create new customer with automatic credit calculation
export const createCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
  try {
    // If payment amount and service duration are provided, calculate credits automatically
    let processedData = { ...customerData };
    
    if (customerData.amount && customerData.serviceDuration && customerData.paymentDate) {
      const paymentAmount = parseFloat(customerData.amount);
      const serviceDuration = parseInt(customerData.serviceDuration);
      const servicePrice = 25; // Default service price - you can make this dynamic based on selected service
      
      if (!isNaN(paymentAmount) && !isNaN(serviceDuration)) {
        const calculatedCredits = calculateCustomerCredits(
          paymentAmount,
          servicePrice,
          customerData.paymentDate,
          serviceDuration
        );
        
        processedData = {
          ...processedData,
          totalCredit: calculatedCredits.totalCredit,
          alreadyGiven: calculatedCredits.alreadyGiven,
          remainingCredits: calculatedCredits.remainingCredits,
          expiryDate: calculatedCredits.expiryDate
        };
      }
    }
    
    const response = await customersAPI.create(processedData);
    return response.customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

// Update customer
export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer | null> => {
  try {
    const response = await customersAPI.update(id, updates);
    return response.customer || null;
  } catch (error) {
    console.error('Error updating customer:', error);
    return null;
  }
};

// Delete customer
export const deleteCustomer = async (id: string): Promise<boolean> => {
  try {
    await customersAPI.delete(id);
    return true;
  } catch (error) {
    console.error('Error deleting customer:', error);
    return false;
  }
};

// Seed customers
export const seedCustomers = async (): Promise<void> => {
  try {
    await customersAPI.seed();
  } catch (error) {
    console.error('Error seeding customers:', error);
  }
};
