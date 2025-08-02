import { customersAPI } from '../services/api';

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
    console.error('Error getting customer:', error);
    return null;
  }
};

// Create new customer
export const createCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
  try {
    const response = await customersAPI.create(customerData);
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
    console.log('Customers seeded successfully');
  } catch (error) {
    console.error('Error seeding customers:', error);
  }
};
