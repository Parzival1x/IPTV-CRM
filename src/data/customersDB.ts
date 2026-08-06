import { customersAPI, ApiError, type CustomerQuery, type Pagination } from '../services/api';

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
  durationMonths: number;
  features: string[];
  category: string;
  sku: string;
  currency: string;
  // How far into the current billing cycle the customer has paid. A part
  // payment used to be written as a `pending` row that no balance calculation
  // counted, so the money vanished from every screen.
  cyclePaidAmount: string;
  outstandingAmount: string;
  isPartiallyPaid: boolean;
  metadata: Record<string, unknown>;
}

export interface CustomerPaymentAllocation {
  id: string;
  subscriptionId: string | null;
  serviceLabel: string;
  amount: string;
  renewed: boolean;
  consumed: boolean;
}

export interface CustomerPayment {
  id: string;
  subscriptionId: string | null;
  serviceLabel: string;
  amount: string;
  finalAmount: string;
  discount: string;
  tax: string;
  currency: string;
  paymentMode: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  transactionId: string;
  paymentDate: string;
  nextDueDate: string;
  notes: string;
  isRefundable: boolean;
  // One payment event split across several services is one payment with
  // several allocations, rather than several payment rows.
  allocations: CustomerPaymentAllocation[];
  creditAmount: string;
}

export interface CustomerPaymentSummary {
  recurringAmount: string;
  dueNow: string;
  overdueAmount: string;
  totalPaid: string;
  totalRefunded: string;
  availableCredit: string;
  outstandingBalance: string;
  dueSoonServiceCount: number;
  overdueServiceCount: number;
  activeServiceCount: number;
  serviceCount: number;
  lastPaymentDate: string | null;
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
  currency: string;
  // Read-only. These come from the customer_financials view and are no longer
  // stored or accepted from the client; the API discards them on write.
  totalCredit: string;
  alreadyGiven: string;
  remainingCredits: string;
  note: string;
  serviceDuration: string;
  portalAccessEnabled?: boolean;
  portalResetRequired?: boolean;
  portalLastLogin?: string | null;
  portalPasswordExpiresAt?: string | null;
  deletedAt?: string | null;
  whatsappOptIn?: boolean;
  emailOptIn?: boolean;
  portalSetup?: {
    temporaryPassword: string;
    resetRequired: boolean;
    expiresAt?: string;
    expiresInHours?: number;
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
  discount?: string;
  tax?: string;
  currency?: string;
  notes?: string;
  // Draw on any credit the customer is already sitting on before charging the
  // shortfall. Defaults to true server side.
  applyCredit?: boolean;
}

type CustomersResponse = {
  customers?: Customer[];
  pagination?: Pagination;
};

type CustomerResponse = {
  customer?: Customer | null;
  portalSetup?: Customer["portalSetup"];
};

export type CustomerListResult = {
  customers: Customer[];
  pagination: Pagination;
};

const EMPTY_PAGINATION: Pagination = { page: 1, pageSize: 25, total: 0, totalPages: 1 };

// Server-side search, filter, sort and paging.
export const listCustomers = async (
  params: CustomerQuery = {}
): Promise<CustomerListResult> => {
  const response = (await customersAPI.list(params)) as CustomersResponse;

  return {
    customers: response.customers || [],
    pagination: response.pagination || EMPTY_PAGINATION,
  };
};

// Everything, by paging through the API. Only for callers that genuinely need
// the whole set -- an export, a bulk action over a filtered selection. Screens
// should use listCustomers and page.
export const getAllCustomers = async (params: CustomerQuery = {}): Promise<Customer[]> => {
  const collected: Customer[] = [];
  let page = 1;

  for (;;) {
    const { customers, pagination } = await listCustomers({ ...params, page, pageSize: 200 });
    collected.push(...customers);

    if (customers.length === 0 || page >= pagination.totalPages) {
      break;
    }

    page += 1;
  }

  return collected;
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

// Create new customer.
//
// This used to run calculateCustomerCredits() -- with a service price
// hardcoded to 25 -- and post the resulting totalCredit / alreadyGiven /
// remainingCredits along with an expiry date derived from them. The server
// overwrote the balances but kept the expiry, so every new customer got a
// fabricated one. The server owns all of it now.
export const createCustomer = async (
  customerData: Partial<Customer> & { services?: CustomerServiceInput[] }
): Promise<Customer> => {
  const response = (await customersAPI.create(customerData)) as CustomerResponse;

  if (!response.customer) {
    throw new Error('Customer creation succeeded without a returned customer record.');
  }

  return response.customer;
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

export const refundCustomerPayment = async (
  customerId: string,
  paymentId: string,
  reason?: string
): Promise<Customer | null> => {
  const response = (await customersAPI.refundPayment(customerId, paymentId, reason)) as CustomerResponse;
  return response.customer || null;
};

export const cancelCustomerService = async (
  customerId: string,
  serviceId: string
): Promise<Customer | null> => {
  const response = (await customersAPI.cancelService(customerId, serviceId)) as CustomerResponse;
  return response.customer || null;
};

export const restoreCustomer = async (id: string): Promise<Customer | null> => {
  const response = (await customersAPI.restore(id)) as CustomerResponse;
  return response.customer || null;
};

export const setCustomerPortalAccess = async (
  id: string,
  enabled: boolean
): Promise<Customer | null> => {
  const response = (await customersAPI.setPortalAccess(id, enabled)) as CustomerResponse;
  return response.customer || null;
};

export interface CustomerActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorName: string;
  actorEmail: string;
}

export const getCustomerActivity = async (id: string): Promise<CustomerActivityEntry[]> => {
  const response = (await customersAPI.getActivity(id)) as { activity?: CustomerActivityEntry[] };
  return response.activity || [];
};
