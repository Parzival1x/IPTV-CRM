// Customer data types
export interface Customer {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string;
  avatar: string;
  phone: string;
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
}

// Mock customer data (in a real app, this would come from an API)
export const CUSTOMERS_DATA: Customer[] = [
  { 
    id: 1, 
    name: 'John Doe', 
    email: 'john@example.com', 
    role: 'Premium Customer', 
    status: 'Active', 
    lastLogin: '2024-01-15', 
    avatar: '👨‍💼',
    phone: '+1 (555) 123-4567',
    mac: '00:1B:63:84:45:E6',
    box: 'BOX-001',
    startDate: '2024-01-01',
    paymentDate: '2024-01-15',
    paymentMode: 'Credit Card',
    amount: '$99.99',
    expiryDate: '2024-12-31',
    totalCredit: '$500.00',
    alreadyGiven: '$300.00',
    remainingCredits: '$200.00',
    note: 'Premium customer with excellent payment history. Prefers email communication.'
  },
  { 
    id: 2, 
    name: 'Jane Smith', 
    email: 'jane@example.com', 
    role: 'Standard Customer', 
    status: 'Active', 
    lastLogin: '2024-01-14', 
    avatar: '👩‍💼',
    phone: '+1 (555) 234-5678',
    mac: '00:1B:63:84:45:E7',
    box: 'BOX-002',
    startDate: '2024-01-02',
    paymentDate: '2024-01-14',
    paymentMode: 'PayPal',
    amount: '$79.99',
    expiryDate: '2024-12-30',
    totalCredit: '$400.00',
    alreadyGiven: '$250.00',
    remainingCredits: '$150.00',
    note: 'Regular customer, always pays on time. Prefers phone calls for important updates.'
  },
  { 
    id: 3, 
    name: 'Bob Johnson', 
    email: 'bob@example.com', 
    role: 'Basic Customer', 
    status: 'Inactive', 
    lastLogin: '2024-01-10', 
    avatar: '👨‍💻',
    phone: '+1 (555) 345-6789',
    mac: '00:1B:63:84:45:E8',
    box: 'BOX-003',
    startDate: '2024-01-03',
    paymentDate: '2024-01-10',
    paymentMode: 'Bank Transfer',
    amount: '$59.99',
    expiryDate: '2024-12-29',
    totalCredit: '$300.00',
    alreadyGiven: '$300.00',
    remainingCredits: '$0.00',
    note: 'Account suspended due to non-payment. Needs follow-up.'
  },
  { 
    id: 4, 
    name: 'Alice Brown', 
    email: 'alice@example.com', 
    role: 'Premium Customer', 
    status: 'Active', 
    lastLogin: '2024-01-13', 
    avatar: '👩‍💻',
    phone: '+1 (555) 456-7890',
    mac: '00:1B:63:84:45:E9',
    box: 'BOX-004',
    startDate: '2024-01-04',
    paymentDate: '2024-01-13',
    paymentMode: 'Credit Card',
    amount: '$119.99',
    expiryDate: '2024-12-28',
    totalCredit: '$600.00',
    alreadyGiven: '$200.00',
    remainingCredits: '$400.00',
    note: 'VIP customer with multiple subscriptions. Excellent payment history.'
  },
  { 
    id: 5, 
    name: 'Charlie Wilson', 
    email: 'charlie@example.com', 
    role: 'Standard Customer', 
    status: 'Active', 
    lastLogin: '2024-01-12', 
    avatar: '👨‍🔧',
    phone: '+1 (555) 567-8901',
    mac: '00:1B:63:84:45:EA',
    box: 'BOX-005',
    startDate: '2024-01-05',
    paymentDate: '2024-01-12',
    paymentMode: 'Debit Card',
    amount: '$89.99',
    expiryDate: '2024-12-27',
    totalCredit: '$450.00',
    alreadyGiven: '$150.00',
    remainingCredits: '$300.00',
    note: 'Technician who understands our service well. Very satisfied customer.'
  },
  { 
    id: 6, 
    name: 'Diana Davis', 
    email: 'diana@example.com', 
    role: 'Basic Customer', 
    status: 'Pending', 
    lastLogin: '2024-01-11', 
    avatar: '👩‍🔬',
    phone: '+1 (555) 678-9012',
    mac: '00:1B:63:84:45:EB',
    box: 'BOX-006',
    startDate: '2024-01-06',
    paymentDate: '2024-01-11',
    paymentMode: 'Cash',
    amount: '$49.99',
    expiryDate: '2024-12-26',
    totalCredit: '$250.00',
    alreadyGiven: '$50.00',
    remainingCredits: '$200.00',
    note: 'New customer, payment verification pending. Needs activation.'
  },
  { 
    id: 7, 
    name: 'Eva Martinez', 
    email: 'eva@example.com', 
    role: 'Premium Customer', 
    status: 'Active', 
    lastLogin: '2024-01-09', 
    avatar: '👩‍🎨',
    phone: '+1 (555) 789-0123',
    mac: '00:1B:63:84:45:EC',
    box: 'BOX-007',
    startDate: '2024-01-07',
    paymentDate: '2024-01-09',
    paymentMode: 'Credit Card',
    amount: '$109.99',
    expiryDate: '2024-12-25',
    totalCredit: '$550.00',
    alreadyGiven: '$100.00',
    remainingCredits: '$450.00',
    note: 'Artist who uses our service for streaming. Very creative and engaged customer.'
  },
  { 
    id: 8, 
    name: 'Frank Garcia', 
    email: 'frank@example.com', 
    role: 'Standard Customer', 
    status: 'Inactive', 
    lastLogin: '2024-01-08', 
    avatar: '👨‍🎨',
    phone: '+1 (555) 890-1234',
    mac: '00:1B:63:84:45:ED',
    box: 'BOX-008',
    startDate: '2024-01-08',
    paymentDate: '2024-01-08',
    paymentMode: 'PayPal',
    amount: '$69.99',
    expiryDate: '2024-12-24',
    totalCredit: '$350.00',
    alreadyGiven: '$350.00',
    remainingCredits: '$0.00',
    note: 'Service suspended due to policy violation. Requires review before reactivation.'
  },
  { 
    id: 9, 
    name: 'Grace Lee', 
    email: 'grace@example.com', 
    role: 'Premium Customer', 
    status: 'Active', 
    lastLogin: '2024-01-07', 
    avatar: '👩‍🏫',
    phone: '+1 (555) 901-2345',
    mac: '00:1B:63:84:45:EE',
    box: 'BOX-009',
    startDate: '2024-01-09',
    paymentDate: '2024-01-07',
    paymentMode: 'Bank Transfer',
    amount: '$129.99',
    expiryDate: '2024-12-23',
    totalCredit: '$650.00',
    alreadyGiven: '$150.00',
    remainingCredits: '$500.00',
    note: 'Educator who uses our service for online classes. Highly valued customer.'
  },
  { 
    id: 10, 
    name: 'Henry Clark', 
    email: 'henry@example.com', 
    role: 'Standard Customer', 
    status: 'Active', 
    lastLogin: '2024-01-06', 
    avatar: '👨‍🏫',
    phone: '+1 (555) 012-3456',
    mac: '00:1B:63:84:45:EF',
    box: 'BOX-010',
    startDate: '2024-01-10',
    paymentDate: '2024-01-06',
    paymentMode: 'Credit Card',
    amount: '$79.99',
    expiryDate: '2024-12-22',
    totalCredit: '$400.00',
    alreadyGiven: '$200.00',
    remainingCredits: '$200.00',
    note: 'Teacher who recommends our service to colleagues. Good referral source.'
  },
  { 
    id: 11, 
    name: 'Ivy Rodriguez', 
    email: 'ivy@example.com', 
    role: 'Basic Customer', 
    status: 'Pending', 
    lastLogin: '2024-01-05', 
    avatar: '👩‍⚕️',
    phone: '+1 (555) 123-4567',
    mac: '00:1B:63:84:45:F0',
    box: 'BOX-011',
    startDate: '2024-01-11',
    paymentDate: '2024-01-05',
    paymentMode: 'Debit Card',
    amount: '$59.99',
    expiryDate: '2024-12-21',
    totalCredit: '$300.00',
    alreadyGiven: '$0.00',
    remainingCredits: '$300.00',
    note: 'Healthcare professional. Account setup in progress, awaiting documentation.'
  },
  { 
    id: 12, 
    name: 'Jack White', 
    email: 'jack@example.com', 
    role: 'Premium Customer', 
    status: 'Active', 
    lastLogin: '2024-01-04', 
    avatar: '👨‍⚕️',
    phone: '+1 (555) 234-5678',
    mac: '00:1B:63:84:45:F1',
    box: 'BOX-012',
    startDate: '2024-01-12',
    paymentDate: '2024-01-04',
    paymentMode: 'Wire Transfer',
    amount: '$149.99',
    expiryDate: '2024-12-20',
    totalCredit: '$750.00',
    alreadyGiven: '$250.00',
    remainingCredits: '$500.00',
    note: 'Medical professional with enterprise account. Requires high-priority support.'
  },
];

// API simulation functions
export const getCustomerById = async (id: number): Promise<Customer | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return CUSTOMERS_DATA.find(customer => customer.id === id) || null;
};

export const getAllCustomers = async (): Promise<Customer[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return CUSTOMERS_DATA;
};

export const updateCustomer = async (id: number, updates: Partial<Customer>): Promise<Customer | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const customerIndex = CUSTOMERS_DATA.findIndex(customer => customer.id === id);
  if (customerIndex === -1) return null;
  
  CUSTOMERS_DATA[customerIndex] = { ...CUSTOMERS_DATA[customerIndex], ...updates };
  return CUSTOMERS_DATA[customerIndex];
};

export const deleteCustomer = async (id: number): Promise<boolean> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const customerIndex = CUSTOMERS_DATA.findIndex(customer => customer.id === id);
  if (customerIndex === -1) return false;
  
  CUSTOMERS_DATA.splice(customerIndex, 1);
  return true;
};
