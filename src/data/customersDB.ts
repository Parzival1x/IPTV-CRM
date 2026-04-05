import { customersAPI, ApiError } from '../services/api';
import { formatCreditAmount } from '../utils/creditFormatter';

// Customer interface
export interface CustomerSubscription {
  id: string;
  planId: string;
  planCode: string;
  planName: string;
  description: string;
  status: 'active' | 'expired' | 'cancelled' | 'suspended' | 'draft';
  activationDate: string;
  expiryDate: string;
  discount: string;
  autoRenew: boolean;
  amount: string;
  paymentMode: string;
  transactionId: string;
  serviceCode: string;
  serviceLabel: string;
  deviceBox: string;
  deviceMac: string;
  portalUrl: string;
  billingUrl: string;
  maxConnections: number;
  features: string[];
  category: string;
  sku: string;
  metadata: Record<string, unknown>;
}

export interface CustomerPayment {
  id: string;
  subscriptionId: string | null;
  serviceLabel: string;
  amount: string;
  finalAmount: string;
  discount: string;
  tax: string;
  paymentMode: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  transactionId: string;
  paymentDate: string;
  nextDueDate: string;
}

export interface CustomerPaymentSummary {
  recurringAmount: string;
  dueNow: string;
  overdueAmount: string;
  totalPaid: string;
  availableCredit: string;
  outstandingBalance: string;
  dueSoonServiceCount: number;
  overdueServiceCount: number;
}

export interface Customer {
  id: string;
  customerCode: string;
  serviceId: string;
  transactionId: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  city: string;
  country: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
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
  portalAccessEnabled?: boolean;
  portalResetRequired?: boolean;
  portalLastLogin?: string | null;
  portalSetup?: {
    temporaryPassword: string;
    resetRequired: boolean;
  };
  subscriptions: CustomerSubscription[];
  payments?: CustomerPayment[];
  paymentSummary?: CustomerPaymentSummary;
}

export interface CustomerServiceInput {
  planCode: string;
  templateId?: string;
  name: string;
  category?: string;
  sku?: string;
  description?: string;
  features?: string[];
  paymentMode: string;
  amount: string;
  durationMonths: string;
  startDate: string;
  paymentDate: string;
  expiryDate: string;
  box?: string;
  mac?: string;
  portalUrl?: string;
  billingUrl?: string;
  maxConnections?: number;
  transactionId?: string;
  serviceCode?: string;
  autoRenew?: boolean;
  status?: CustomerSubscription['status'];
  discount?: string;
}

export interface CustomerPaymentInput {
  subscriptionIds: string[];
  amount?: string;
  paymentMode: string;
  paymentDate?: string;
  transactionId?: string;
}

type CustomersResponse = {
  customers?: Customer[];
};

type CustomerResponse = {
  customer?: Customer | null;
  portalSetup?: Customer["portalSetup"];
};

const parseCurrencyValue = (value: string | number): number => {
  if (typeof value === 'number') {
    return value;
  }

  return parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
};

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
  const paymentAmount = parseCurrencyValue(customer.amount);
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
    const response = (await customersAPI.getAll()) as CustomersResponse;
    return response.customers || [];
  } catch (error) {
    throw error;
  }
};

// Get customer by ID
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const response = (await customersAPI.getById(id)) as CustomerResponse;
    return response.customer || null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};

// Create new customer with automatic credit calculation
export const createCustomer = async (
  customerData: Omit<Customer, 'id' | 'subscriptions'> & { services?: CustomerServiceInput[] }
): Promise<Customer> => {
  try {
    // If payment amount and service duration are provided, calculate credits automatically
    let processedData = { ...customerData };
    
    if (customerData.amount && customerData.serviceDuration && customerData.paymentDate) {
      const paymentAmount = parseCurrencyValue(customerData.amount);
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
    
    const response = (await customersAPI.create(processedData)) as CustomerResponse;

    if (!response.customer) {
      throw new Error('Customer creation succeeded without a returned customer record.');
    }

    return response.customer;
  } catch (error) {
    throw error;
  }
};

// Update customer
export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer | null> => {
  try {
    const response = (await customersAPI.update(id, updates)) as CustomerResponse;
    return response.customer || null;
  } catch (error) {
    throw error;
  }
};

// Delete customer
export const deleteCustomer = async (id: string): Promise<boolean> => {
  try {
    await customersAPI.delete(id);
    return true;
  } catch (error) {
    throw error;
  }
};

export const resetCustomerPortalPassword = async (id: string): Promise<Customer | null> => {
  try {
    const response = (await customersAPI.resetPortalPassword(id)) as CustomerResponse;

    if (!response.customer) {
      return null;
    }

    return {
      ...response.customer,
      portalSetup: response.portalSetup,
    };
  } catch (error) {
    throw error;
  }
};

export const addCustomerService = async (
  id: string,
  service: CustomerServiceInput
): Promise<Customer | null> => {
  try {
    const response = (await customersAPI.addService(id, service)) as CustomerResponse;
    return response.customer || null;
  } catch (error) {
    throw error;
  }
};

export const updateCustomerService = async (
  customerId: string,
  serviceId: string,
  service: CustomerServiceInput
): Promise<Customer | null> => {
  try {
    const response = (await customersAPI.updateService(customerId, serviceId, service)) as CustomerResponse;
    return response.customer || null;
  } catch (error) {
    throw error;
  }
};

export const recordCustomerPayment = async (
  customerId: string,
  payment: CustomerPaymentInput
): Promise<Customer | null> => {
  try {
    const response = (await customersAPI.recordPayment(customerId, payment)) as CustomerResponse;
    return response.customer || null;
  } catch (error) {
    throw error;
  }
};

