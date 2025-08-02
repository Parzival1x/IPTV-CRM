import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCustomerById, updateCustomer, Customer, recalculateCreditsOnPaymentDateChange } from '../data/customersDB';
import ToastNotification from '../components/common/ToastNotification';
import TwilioWhatsAppMessaging from '../components/common/TwilioWhatsAppMessaging';
import { formatCreditAmount } from '../utils/creditFormatter';

// Service interface for customer services
interface CustomerService {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  status: 'active' | 'inactive' | 'pending';
  startDate: string;
  expiryDate: string;
  paymentDate: string;
  paymentMode: string;
  amount: string;
  serviceDuration: string;
  box?: string;
  mac?: string;
  portalUrl?: string;
  billingUrl?: string;
  totalCredit: string;
  alreadyGiven: string;
  remainingCredits: string;
  note?: string;
  paymentHistory?: PaymentRecord[];
}

// Payment record interface
interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  mode: string;
  description?: string;
  notes?: string;
}

// Service template interface for auto-population
interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  portalUrlTemplate: string;
  billingUrlTemplate: string;
  defaultDuration: string;
  requiresBox: boolean;
  requiresMac: boolean;
}

const CustomerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Customer | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedService, setSelectedService] = useState<CustomerService | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // State for adding new services
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [selectedServiceTemplate, setSelectedServiceTemplate] = useState<ServiceTemplate | null>(null);
  const [serviceStartDate, setServiceStartDate] = useState('');
  const [servicePaymentDate, setServicePaymentDate] = useState('');
  const [servicePaymentMode, setServicePaymentMode] = useState('cash');
  const [serviceAmount, setServiceAmount] = useState('');

  // WhatsApp messaging state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [serviceBox, setServiceBox] = useState('');
  const [serviceMac, setServiceMac] = useState('');

  // State for managing customer services
  const [customerServices, setCustomerServices] = useState<CustomerService[]>([]);

  // Service templates for auto-population
  const serviceTemplates: ServiceTemplate[] = [
    {
      id: 'INT-PRE-001',
      name: 'Premium Internet Package',
      category: 'Internet Services',
      price: 50,
      sku: 'INT-PRE-001',
      portalUrlTemplate: 'https://premium.internet.example.com/customer/{customerId}',
      billingUrlTemplate: 'https://billing.premium.internet.example.com/customer/{customerId}',
      defaultDuration: '12',
      requiresBox: true,
      requiresMac: true
    },
    {
      id: 'IPTV-BAS-001',
      name: 'IPTV Basic Package',
      category: 'TV Services',
      price: 30,
      sku: 'IPTV-BAS-001',
      portalUrlTemplate: 'https://iptv.basic.example.com/portal/{customerId}',
      billingUrlTemplate: 'https://billing.iptv.basic.example.com/account/{customerId}',
      defaultDuration: '12',
      requiresBox: true,
      requiresMac: true
    },
    {
      id: 'VPN-001',
      name: 'VPN Service',
      category: 'Security Services',
      price: 15,
      sku: 'VPN-001',
      portalUrlTemplate: 'https://vpn.example.com/dashboard/{customerId}',
      billingUrlTemplate: 'https://billing.vpn.example.com/customer/{customerId}',
      defaultDuration: '12',
      requiresBox: false,
      requiresMac: false
    },
    {
      id: 'IPTV-PRE-001',
      name: 'IPTV Premium Package',
      category: 'TV Services',
      price: 60,
      sku: 'IPTV-PRE-001',
      portalUrlTemplate: 'https://iptv.premium.example.com/portal/{customerId}',
      billingUrlTemplate: 'https://billing.iptv.premium.example.com/account/{customerId}',
      defaultDuration: '12',
      requiresBox: true,
      requiresMac: true
    },
    {
      id: 'INT-BAS-001',
      name: 'Basic Internet Package',
      category: 'Internet Services',
      price: 25,
      sku: 'INT-BAS-001',
      portalUrlTemplate: 'https://basic.internet.example.com/customer/{customerId}',
      billingUrlTemplate: 'https://billing.basic.internet.example.com/customer/{customerId}',
      defaultDuration: '12',
      requiresBox: false,
      requiresMac: false
    }
  ];

  // Function to generate URLs based on service template and customer ID
  const generateServiceUrls = (serviceTemplate: ServiceTemplate, customerId: string) => {
    return {
      portalUrl: serviceTemplate.portalUrlTemplate.replace('{customerId}', customerId),
      billingUrl: serviceTemplate.billingUrlTemplate.replace('{customerId}', customerId)
    };
  };

  // Function to create a new customer service from template
  const createCustomerServiceFromTemplate = (
    serviceTemplate: ServiceTemplate, 
    customerId: string, 
    additionalData: {
      startDate: string;
      paymentDate: string;
      paymentMode: string;
      amount: string;
      box?: string;
      mac?: string;
    }
  ): CustomerService => {
    const urls = generateServiceUrls(serviceTemplate, customerId);
    
    return {
      id: `srv-${Date.now()}`,
      name: serviceTemplate.name,
      category: serviceTemplate.category,
      price: serviceTemplate.price,
      sku: serviceTemplate.sku,
      status: 'active',
      startDate: additionalData.startDate,
      expiryDate: new Date(new Date(additionalData.startDate).setMonth(
        new Date(additionalData.startDate).getMonth() + parseInt(serviceTemplate.defaultDuration)
      )).toISOString().split('T')[0],
      paymentDate: additionalData.paymentDate,
      paymentMode: additionalData.paymentMode,
      amount: additionalData.amount,
      serviceDuration: serviceTemplate.defaultDuration,
      box: additionalData.box,
      mac: additionalData.mac,
      portalUrl: urls.portalUrl,
      billingUrl: urls.billingUrl,
      totalCredit: additionalData.amount,
      alreadyGiven: '$0.00',
      remainingCredits: additionalData.amount,
      paymentHistory: [{
        id: `pay-${Date.now()}`,
        date: additionalData.paymentDate,
        amount: parseFloat(additionalData.amount.replace('$', '')),
        mode: additionalData.paymentMode,
        description: `Initial payment for ${serviceTemplate.name}`,
        notes: `Service activation payment`
      }]
    };
  };

  // Function to handle adding a new service
  const handleAddService = () => {
    if (!selectedServiceTemplate || !serviceStartDate || !servicePaymentDate || !serviceAmount) {
      setToastMessage('Please fill in all required fields');
      setShowToast(true);
      return;
    }

    if (selectedServiceTemplate.requiresBox && !serviceBox) {
      setToastMessage('Box ID is required for this service');
      setShowToast(true);
      return;
    }

    if (selectedServiceTemplate.requiresMac && !serviceMac) {
      setToastMessage('MAC address is required for this service');
      setShowToast(true);
      return;
    }

    if (!customerData) {
      setToastMessage('Customer data not available');
      setShowToast(true);
      return;
    }

    const newService = createCustomerServiceFromTemplate(
      selectedServiceTemplate,
      customerData.id,
      {
        startDate: serviceStartDate,
        paymentDate: servicePaymentDate,
        paymentMode: servicePaymentMode,
        amount: serviceAmount,
        box: serviceBox,
        mac: serviceMac
      }
    );

    setCustomerServices(prev => [...prev, newService]);

    // Reset form
    setSelectedServiceTemplate(null);
    setServiceStartDate('');
    setServicePaymentDate('');
    setServicePaymentMode('cash');
    setServiceAmount('');
    setServiceBox('');
    setServiceMac('');
    setShowAddServiceModal(false);

    setToastMessage('Service added successfully with auto-populated URLs!');
    setShowToast(true);
  };

  // Initialize services data
  useEffect(() => {
    const mockServices: CustomerService[] = [
      {
        id: 'srv-001',
        name: 'Premium Internet Package',
        category: 'Internet Services',
        price: 50,
      sku: 'INT-PRE-001',
      status: 'active',
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      paymentDate: '2024-01-15',
      paymentMode: 'Credit Card',
      amount: '$600.00',
      serviceDuration: '12',
      box: 'STB-12345',
      mac: '00:11:22:33:44:55',
      portalUrl: 'https://premium.internet.example.com',
      billingUrl: 'https://billing.premium.internet.example.com',
      totalCredit: '$600.00',
      alreadyGiven: '$300.00',
      remainingCredits: '$300.00',
      note: 'Premium package with excellent performance',
      paymentHistory: [
        {
          id: 'pay-001',
          date: '2024-01-15',
          amount: 600.00,
          mode: 'Credit Card',
          description: 'Initial payment for Premium Internet Package',
          notes: 'Service activation payment'
        },
        {
          id: 'pay-002',
          date: '2024-06-15',
          amount: 50.00,
          mode: 'Cash',
          description: 'Additional payment for service upgrade',
          notes: 'Speed upgrade payment'
        }
      ]
    },
    {
      id: 'srv-002',
      name: 'IPTV Basic Package',
      category: 'TV Services',
      price: 30,
      sku: 'IPTV-BAS-001',
      status: 'active',
      startDate: '2024-01-01',
      expiryDate: '2024-12-31',
      paymentDate: '2024-01-15',
      paymentMode: 'Credit Card',
      amount: '$360.00',
      serviceDuration: '12',
      box: 'STB-12346',
      mac: '00:11:22:33:44:56',
      portalUrl: 'https://iptv.basic.example.com',
      billingUrl: 'https://billing.iptv.basic.example.com',
      totalCredit: '$360.00',
      alreadyGiven: '$180.00',
      remainingCredits: '$180.00',
      note: 'Basic TV package with popular channels',
      paymentHistory: [
        {
          id: 'pay-003',
          date: '2024-01-15',
          amount: 360.00,
          mode: 'Credit Card',
          description: 'Initial payment for IPTV Basic Package',
          notes: 'Service activation payment'
        }
      ]
    },
    {
      id: 'srv-003',
      name: 'VPN Service',
      category: 'Security Services',
      price: 15,
      sku: 'VPN-001',
      status: 'active',
      startDate: '2024-02-01',
      expiryDate: '2025-01-31',
      paymentDate: '2024-02-01',
      paymentMode: 'PayPal',
      amount: '$180.00',
      serviceDuration: '12',
      portalUrl: 'https://vpn.example.com',
      billingUrl: 'https://billing.vpn.example.com',
      totalCredit: '$180.00',
      alreadyGiven: '$75.00',
      remainingCredits: '$105.00',
      note: 'VPN service for enhanced security',
      paymentHistory: [
        {
          id: 'pay-004',
          date: '2024-02-01',
          amount: 180.00,
          mode: 'PayPal',
          description: 'Initial payment for VPN Service',
          notes: 'Annual VPN subscription payment'
        }
      ]
    }
  ];
  
  setCustomerServices(mockServices);
  }, []);

  // Calculate overall credit summary from all services
  const calculateOverallCreditSummary = () => {
    if (customerServices.length === 0) {
      return {
        totalCredit: 0,
        alreadyGiven: 0,
        remainingCredits: 0
      };
    }

    const summary = customerServices.reduce((acc, service) => {
      const totalCredit = parseFloat(service.totalCredit?.replace('$', '') || '0');
      const alreadyGiven = parseFloat(service.alreadyGiven?.replace('$', '') || '0');
      const remainingCredits = parseFloat(service.remainingCredits?.replace('$', '') || '0');

      return {
        totalCredit: acc.totalCredit + totalCredit,
        alreadyGiven: acc.alreadyGiven + alreadyGiven,
        remainingCredits: acc.remainingCredits + remainingCredits
      };
    }, { totalCredit: 0, alreadyGiven: 0, remainingCredits: 0 });

    return summary;
  };

  // Get overall service statistics
  const getServiceStatistics = () => {
    const activeServices = customerServices.filter(service => service.status === 'active').length;
    const totalServices = customerServices.length;
    const monthlyTotal = customerServices.reduce((sum, service) => sum + service.price, 0);
    
    return {
      activeServices,
      totalServices,
      monthlyTotal
    };
  };

  const openServiceModal = (service: CustomerService) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const closeServiceModal = () => {
    setSelectedService(null);
    setShowServiceModal(false);
    setShowPaymentForm(false);
    setPaymentAmount('');
    setPaymentDate('');
    setPaymentMode('cash');
  };

  const handleAddPayment = () => {
    setShowPaymentForm(true);
    setPaymentDate(new Date().toISOString().split('T')[0]); // Set current date as default
  };

  const handlePaymentSubmit = () => {
    if (!paymentAmount || !paymentDate || !selectedService) return;
    
    // Calculate new credits based on payment
    const paymentAmountNum = parseFloat(paymentAmount);
    const currentTotalCredit = parseFloat(selectedService.totalCredit.replace('$', ''));
    const newTotalCredit = currentTotalCredit + paymentAmountNum;
    
    // Create new payment record
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      date: paymentDate,
      amount: paymentAmountNum,
      mode: paymentMode,
      description: `Payment for ${selectedService.name}`,
      notes: paymentNotes
    };
    
    // Update payment history
    const updatedPaymentHistory = [...(selectedService.paymentHistory || []), newPayment];
    
    // Update the service with new payment and credit information
    const updatedService = {
      ...selectedService,
      totalCredit: `$${newTotalCredit.toFixed(2)}`,
      remainingCredits: `$${(newTotalCredit - parseFloat(selectedService.alreadyGiven.replace('$', ''))).toFixed(2)}`,
      paymentDate: paymentDate,
      amount: `$${paymentAmountNum.toFixed(2)}`,
      paymentMode: paymentMode,
      paymentHistory: updatedPaymentHistory
    };
    
    setSelectedService(updatedService);
    setShowPaymentForm(false);
    setPaymentAmount('');
    setPaymentDate('');
    setPaymentMode('cash');
    setPaymentNotes('');
    
    // Show success message
    setToastMessage(`Payment of $${paymentAmountNum.toFixed(2)} added successfully!`);
    setShowToast(true);
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!id) {
          console.error('No customer ID provided');
          setError('Customer ID is required');
          return;
        }
        
        // Use mock data for testing
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
        
        setCustomerData(mockCustomer);
        setFormData(mockCustomer);
        
        // Try to fetch from API as well
        try {
          const customer = await getCustomerById(id);
          if (customer) {
            setCustomerData(customer);
            setFormData(customer);
          }
        } catch (apiError) {
          console.warn('API fetch failed, using mock data:', apiError);
        }
        
      } catch (err) {
        console.error('Error in fetchCustomerData:', err);
        setError(`Error loading customer data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [id]);

  // Color coding for total credit background (based on amount)
  const getTotalCreditBackgroundColor = (totalCredit: number | string) => {
    const totalNum = typeof totalCredit === 'string' ? parseFloat(totalCredit) : totalCredit;
    
    if (isNaN(totalNum) || totalNum === 0) {
      return 'bg-gray-100/60 dark:bg-gray-700/60 border-gray-200/30 dark:border-gray-600/30';
    }
    
    // Color based on total credit amount ranges
    if (totalNum >= 1000) {
      return 'bg-blue-100/60 dark:bg-blue-900/60 border-blue-200/30 dark:border-blue-700/30'; // High amount
    } else if (totalNum >= 500) {
      return 'bg-indigo-100/60 dark:bg-indigo-900/60 border-indigo-200/30 dark:border-indigo-700/30'; // Medium amount
    } else {
      return 'bg-purple-100/60 dark:bg-purple-900/60 border-purple-200/30 dark:border-purple-700/30'; // Low amount
    }
  };

  // Color coding for already given background (based on usage)
  const getAlreadyGivenBackgroundColor = (alreadyGiven: number | string, totalCredit: number | string) => {
    const alreadyGivenNum = typeof alreadyGiven === 'string' ? parseFloat(alreadyGiven) : alreadyGiven;
    const totalNum = typeof totalCredit === 'string' ? parseFloat(totalCredit) : totalCredit;
    
    if (isNaN(alreadyGivenNum) || isNaN(totalNum) || totalNum === 0) {
      return 'bg-gray-100/60 dark:bg-gray-700/60 border-gray-200/30 dark:border-gray-600/30';
    }
    
    const usagePercentage = (alreadyGivenNum / totalNum) * 100;
    if (usagePercentage <= 30) {
      return 'bg-teal-100/60 dark:bg-teal-900/60 border-teal-200/30 dark:border-teal-700/30'; // Low usage
    } else if (usagePercentage <= 70) {
      return 'bg-orange-100/60 dark:bg-orange-900/60 border-orange-200/30 dark:border-orange-700/30'; // Medium usage
    } else {
      return 'bg-rose-100/60 dark:bg-rose-900/60 border-rose-200/30 dark:border-rose-700/30'; // High usage
    }
  };

  // Color coding for credit background
  const getCreditBackgroundColor = (remaining: number | string, total: number | string) => {
    const remainingNum = typeof remaining === 'string' ? parseFloat(remaining) : remaining;
    const totalNum = typeof total === 'string' ? parseFloat(total) : total;
    
    if (isNaN(remainingNum) || isNaN(totalNum) || totalNum === 0) {
      return 'bg-gray-100/60 dark:bg-gray-700/60 border-gray-200/30 dark:border-gray-600/30';
    }
    
    const percentage = (remainingNum / totalNum) * 100;
    if (percentage > 70) {
      return 'bg-green-100/60 dark:bg-green-900/60 border-green-200/30 dark:border-green-700/30';
    } else if (percentage > 30) {
      return 'bg-yellow-100/60 dark:bg-yellow-900/60 border-yellow-200/30 dark:border-yellow-700/30';
    } else {
      return 'bg-red-100/60 dark:bg-red-900/60 border-red-200/30 dark:border-red-700/30';
    }
  };

  // Color coding for credit status
  const getCreditBadgeColor = (remaining: number | string, total: number | string) => {
    const remainingNum = typeof remaining === 'string' ? parseFloat(remaining) : remaining;
    const totalNum = typeof total === 'string' ? parseFloat(total) : total;
    
    if (isNaN(remainingNum) || isNaN(totalNum) || totalNum === 0) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
    
    const percentage = (remainingNum / totalNum) * 100;
    if (percentage > 70) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    } else if (percentage > 30) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    } else {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
  };

  const getCreditStatusText = (remaining: number | string, total: number | string) => {
    const remainingNum = typeof remaining === 'string' ? parseFloat(remaining) : remaining;
    const totalNum = typeof total === 'string' ? parseFloat(total) : total;
    
    if (isNaN(remainingNum) || isNaN(totalNum) || totalNum === 0) {
      return 'Invalid';
    }
    
    const percentage = (remainingNum / totalNum) * 100;
    if (percentage > 70) {
      return 'Healthy';
    } else if (percentage > 30) {
      return 'Low';
    } else {
      return 'Critical';
    }
  };

  const handleGoBack = () => {
    navigate('/tables');
  };

  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500 text-white',
      'bg-green-500 text-white',
      'bg-purple-500 text-white',
      'bg-pink-500 text-white',
      'bg-indigo-500 text-white',
      'bg-yellow-500 text-white',
      'bg-red-500 text-white',
      'bg-teal-500 text-white',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form data
      setFormData(customerData);
      setIsEditing(false);
    } else {
      // Start editing
      setIsEditing(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (!formData) return;
    
    // Handle credit amount formatting
    if (name === 'totalCredit' || name === 'alreadyGiven' || name === 'remainingCredits') {
      // Remove any non-numeric characters except decimal points
      const cleanValue = value.replace(/[^0-9.]/g, '');
      
      // Ensure only one decimal point
      const parts = cleanValue.split('.');
      let formattedValue = parts[0];
      if (parts.length > 1) {
        formattedValue += '.' + parts[1].substring(0, 2); // Limit to 2 decimal places
      }
      
      setFormData(prev => prev ? { ...prev, [name]: formattedValue } : null);
      return;
    }
    
    // Handle payment date change with credit recalculation
    if (name === 'paymentDate' && value !== formData.paymentDate) {
      const recalculatedCredits = recalculateCreditsOnPaymentDateChange(formData, value);
      setFormData(prev => prev ? { 
        ...prev, 
        [name]: value,
        alreadyGiven: formatCreditAmount(recalculatedCredits.alreadyGiven),
        remainingCredits: formatCreditAmount(recalculatedCredits.remainingCredits),
        expiryDate: recalculatedCredits.expiryDate
      } : null);
      
      // Show toast notification
      setToastMessage('Credits automatically recalculated based on new payment date');
      setShowToast(true);
    } else {
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  // WhatsApp messaging handlers
  const handleWhatsAppSuccess = () => {
    setToastMessage('WhatsApp message sent successfully via Twilio!');
    setShowToast(true);
  };

  const handleWhatsAppError = (error: string) => {
    setToastMessage(`Failed to send WhatsApp message: ${error}`);
    setShowToast(true);
  };

  const handleSave = async () => {
    if (!formData || !id) return;

    setSaving(true);
    setError(null);

    try {
      const updatedCustomer = await updateCustomer(id, formData);
      if (updatedCustomer) {
        setCustomerData(updatedCustomer);
        setFormData(updatedCustomer);
        setIsEditing(false);
      } else {
        setError('Failed to update customer');
      }
    } catch (err) {
      setError('Error updating customer');
      console.error('Error updating customer:', err);
    } finally {
      setSaving(false);
    }
  };

  // Function to calculate expiry date based on service duration and payment date
  const calculateExpiryDate = (paymentDate: string, serviceDuration: string): string => {
    if (!paymentDate || !serviceDuration) return '';
    
    const startDate = new Date(paymentDate);
    const durationMonths = parseInt(serviceDuration);
    
    if (isNaN(durationMonths)) return '';
    
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
    
    return expiryDate.toISOString().split('T')[0];
  };

  // Auto-populate expiry date when service duration or payment date changes during editing
  useEffect(() => {
    if (isEditing && formData?.serviceDuration && formData?.paymentDate) {
      const newExpiryDate = calculateExpiryDate(formData.paymentDate, formData.serviceDuration);
      if (newExpiryDate && newExpiryDate !== formData.expiryDate) {
        setFormData(prev => prev ? ({
          ...prev,
          expiryDate: newExpiryDate
        }) : null);
      }
    }
  }, [formData?.serviceDuration, formData?.paymentDate, isEditing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (error || !customerData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Customer Not Found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The customer you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={handleGoBack}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getAvatarColor(customerData.name)}`}>
                  {getInitials(customerData.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isEditing ? 'Edit Customer' : customerData.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Customer ID: {customerData.id} • {customerData.role.charAt(0).toUpperCase() + customerData.role.slice(1)}
                  </p>
                </div>
              </div>
            </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              customerData.status?.toLowerCase() === 'active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : customerData.status?.toLowerCase() === 'pending'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {customerData.status.charAt(0).toUpperCase() + customerData.status.slice(1)}
            </span>
            {isEditing ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleEditToggle}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="flex space-x-3">
                <button 
                  onClick={handleEditToggle}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Customer
                </button>
                <button 
                  onClick={() => setShowWhatsAppModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.595z"/>
                  </svg>
                  <span>WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Customer Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData?.name || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100">{customerData.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData?.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100">{customerData.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData?.phone || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100">{customerData.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              {isEditing ? (
                <select
                  name="role"
                  value={formData?.role || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="Premium Customer">Premium Customer</option>
                  <option value="Standard Customer">Standard Customer</option>
                  <option value="Basic Customer">Basic Customer</option>
                </select>
              ) : (
                <p className="text-gray-900 dark:text-gray-100">{customerData.role.charAt(0).toUpperCase() + customerData.role.slice(1)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              {isEditing ? (
                <select
                  name="status"
                  value={formData?.status || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              ) : (
                <p className="text-gray-900 dark:text-gray-100">{customerData.status.charAt(0).toUpperCase() + customerData.status.slice(1)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Services */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Customer Services
            </h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddServiceModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-medium">Add Service</span>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {customerServices.length} active services
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {customerServices.map((service) => (
              <div key={service.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                <div 
                  className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 cursor-pointer hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-200"
                  onClick={() => openServiceModal(service)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl flex items-center justify-center shadow-sm">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{service.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{service.category} • {service.sku}</p>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500">Duration: {service.serviceDuration} months</span>
                          <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">Started: {service.startDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getServiceStatusColor(service.status)}`}>
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </span>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">${service.price}/month</p>
                      </div>
                      <svg 
                        className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Credit Information */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Overall Credit Summary
          </h3>
          {(() => {
            const creditSummary = calculateOverallCreditSummary();
            const serviceStats = getServiceStatistics();
            return (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {serviceStats.activeServices} of {serviceStats.totalServices} services active
                  </div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Monthly Total: ${serviceStats.monthlyTotal}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getCreditBadgeColor(creditSummary.remainingCredits.toString(), creditSummary.totalCredit.toString())}`}>
                    {getCreditStatusText(creditSummary.remainingCredits.toString(), creditSummary.totalCredit.toString())}
                  </span>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {creditSummary.totalCredit > 0 ? Math.round((creditSummary.remainingCredits / creditSummary.totalCredit) * 100) : 0}% remaining
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(() => {
            const creditSummary = calculateOverallCreditSummary();
            return (
              <>
                <div className={`backdrop-blur-sm rounded-lg p-4 border ${getTotalCreditBackgroundColor(creditSummary.totalCredit.toString())}`}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Credit (All Services)
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 dark:text-gray-100 font-semibold text-xl">${formatCreditAmount(creditSummary.totalCredit.toString())}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      from {customerServices.length} services
                    </div>
                  </div>
                </div>
                <div className={`backdrop-blur-sm rounded-lg p-4 border ${getAlreadyGivenBackgroundColor(creditSummary.alreadyGiven.toString(), creditSummary.totalCredit.toString())}`}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Already Given (All Services)
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 dark:text-gray-100 font-semibold text-xl">${formatCreditAmount(creditSummary.alreadyGiven.toString())}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      across services
                    </div>
                  </div>
                </div>
                <div className={`backdrop-blur-sm rounded-lg p-4 border ${getCreditBackgroundColor(creditSummary.remainingCredits.toString(), creditSummary.totalCredit.toString())}`}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Remaining Credits (All Services)
                  </label>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-2xl text-gray-900 dark:text-gray-100">
                      ${formatCreditAmount(creditSummary.remainingCredits.toString())}
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Customer Notes
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          {isEditing ? (
            <textarea
              name="note"
              value={formData?.note || ''}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add any notes about this customer..."
            />
          ) : (
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{customerData.note}</p>
          )}
        </div>
      </div>

      {/* Action Buttons - Only show when not editing */}
      {!isEditing && (
        <div className="flex justify-end space-x-4">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Print Details
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
            Send Email
          </button>
        </div>
      )}
      
      {/* Toast Notification */}
      {showToast && (
        <ToastNotification
          message={toastMessage}
          type="info"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Service Detail Modal */}
      {showServiceModal && selectedService && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75" onClick={closeServiceModal}></div>
            </div>

            {/* Modal content */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedService.name}</h3>
                      <p className="text-blue-100 text-sm">{selectedService.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
                      selectedService.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : selectedService.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedService.status.charAt(0).toUpperCase() + selectedService.status.slice(1)}
                    </span>
                    <button
                      onClick={closeServiceModal}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Service Details */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h5 className="text-lg font-bold text-gray-900 dark:text-white">Service Information</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Service Duration</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedService.serviceDuration} months</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Start Date</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedService.startDate}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Expiry Date</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedService.expiryDate}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Monthly Cost</label>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">${selectedService.price}</p>
                      </div>
                      {selectedService.box && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Box ID</label>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">{selectedService.box}</p>
                        </div>
                      )}
                      {selectedService.mac && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">MAC Address</label>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">{selectedService.mac}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment & Credit Details */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h5 className="text-lg font-bold text-gray-900 dark:text-white">Payment & Credit Information</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Payment Date</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedService.paymentDate}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Payment Mode</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedService.paymentMode}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Amount Paid</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedService.amount}</p>
                      </div>
                    </div>

                    {/* Credit Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <h6 className="text-base font-bold text-gray-900 dark:text-white">Service Credit Information</h6>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Credit</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{selectedService.totalCredit}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Already Given</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{selectedService.alreadyGiven}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                          <span className="text-sm font-medium text-white">Remaining Credits</span>
                          <span className="text-xl font-bold text-white">{selectedService.remainingCredits}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Width Payment Sections */}
                <div className="space-y-6 mt-8">
                  {/* Add Payment Section - Full Width */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <h6 className="text-base font-bold text-gray-900 dark:text-white">Add Payment</h6>
                      </div>
                      {!showPaymentForm && (
                        <button
                          onClick={handleAddPayment}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Add Payment
                        </button>
                      )}
                    </div>
                    
                    {showPaymentForm && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Payment Amount ($)
                            </label>
                            <input
                              type="number"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Payment Date
                            </label>
                            <input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Payment Mode
                            </label>
                            <select
                              value={paymentMode}
                              onChange={(e) => setPaymentMode(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Select Payment Mode</option>
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="online">Online</option>
                              <option value="check">Check</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Payment Notes (Optional)
                            </label>
                            <textarea
                              value={paymentNotes}
                              onChange={(e) => setPaymentNotes(e.target.value)}
                              placeholder="Any additional notes about this payment..."
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                              rows={3}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => setShowPaymentForm(false)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handlePaymentSubmit}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Add Payment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment History - Full Width */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h6 className="text-base font-bold text-gray-900 dark:text-white">Payment History</h6>
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
                        {selectedService.paymentHistory?.length || 0} payments
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedService.paymentHistory && selectedService.paymentHistory.length > 0 ? (
                        selectedService.paymentHistory.slice().reverse().map((payment, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">${payment.amount}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{payment.date} • {payment.mode}</div>
                                {payment.notes && <div className="text-xs text-gray-400 dark:text-gray-500">{payment.notes}</div>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600 dark:text-green-400">Paid</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p>No payment history available for this service</p>
                          <p className="text-sm mt-1">Payments will appear here once added</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 dark:bg-gray-700 px-8 py-6 flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Service ID: {selectedService.id} • SKU: {selectedService.sku}
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={closeServiceModal}
                    className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                  >
                    Close
                  </button>
                  <button className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                    Edit Service
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Add New Service</h2>
                <button
                  onClick={() => setShowAddServiceModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-blue-100 mt-2">Select a service template and configure the details</p>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                {/* Service Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select Service Template
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviceTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedServiceTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedServiceTemplate(template)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            ${template.price}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.category}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Configuration */}
                {selectedServiceTemplate && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Service Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={serviceStartDate}
                          onChange={(e) => setServiceStartDate(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Payment Date *
                        </label>
                        <input
                          type="date"
                          value={servicePaymentDate}
                          onChange={(e) => setServicePaymentDate(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Payment Mode *
                        </label>
                        <select
                          value={servicePaymentMode}
                          onChange={(e) => setServicePaymentMode(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          required
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="paypal">PayPal</option>
                          <option value="crypto">Cryptocurrency</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Amount *
                        </label>
                        <input
                          type="text"
                          value={serviceAmount}
                          onChange={(e) => setServiceAmount(e.target.value)}
                          placeholder="$0.00"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          required
                        />
                      </div>
                      {selectedServiceTemplate.requiresBox && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Box ID *
                          </label>
                          <input
                            type="text"
                            value={serviceBox}
                            onChange={(e) => setServiceBox(e.target.value)}
                            placeholder="Enter box ID"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            required
                          />
                        </div>
                      )}
                      {selectedServiceTemplate.requiresMac && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            MAC Address *
                          </label>
                          <input
                            type="text"
                            value={serviceMac}
                            onChange={(e) => setServiceMac(e.target.value)}
                            placeholder="00:00:00:00:00:00"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* URL Preview */}
                    <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">Auto-Generated URLs Preview</h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Portal URL:</span>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                            {selectedServiceTemplate.portalUrlTemplate.replace('{customerId}', customerData?.id || 'CUSTOMER_ID')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Billing URL:</span>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                            {selectedServiceTemplate.billingUrlTemplate.replace('{customerId}', customerData?.id || 'CUSTOMER_ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddService}
                  disabled={!selectedServiceTemplate}
                  className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    selectedServiceTemplate
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Add Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Messaging Modal */}
      {showWhatsAppModal && customerData && (
        <TwilioWhatsAppMessaging
          isOpen={showWhatsAppModal}
          customer={{
            id: customerData.id,
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email
          }}
          onClose={() => setShowWhatsAppModal(false)}
          onSuccess={handleWhatsAppSuccess}
          onError={handleWhatsAppError}
        />
      )}

      {/* Toast Notification */}
      {showToast && (
        <ToastNotification
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
      </div>
    </div>
  );
};

export default CustomerDetail;
