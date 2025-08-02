import { useState, useEffect } from 'react';
import { createCustomer } from '../data/customersDB';
import { useNavigate } from 'react-router-dom';

// Service template interface
interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  features: string[];
  portalUrlTemplate: string;
  billingUrlTemplate: string;
  defaultDuration: string;
  requiresBox: boolean;
  requiresMac: boolean;
}

// Selected service interface
interface SelectedService {
  template: ServiceTemplate;
  startDate: string;
  paymentDate: string;
  paymentMode: string;
  amount: string;
  duration: string;
  box?: string;
  mac?: string;
}

const AddCustomer = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [formData, setFormData] = useState({
    // Customer Basic Info
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerCounty: '',
    customerNotes: '',
    
    // Payment Type
    paymentTypeId: '',
    paymentTypeName: '',
    
    // Customer Subscription
    customerId: '',
    serviceId: '',
    paymentTypeIdSub: '',
    paymentDate: '',
    subscriptionExpiryDate: '',
    amount: ''
  });

  const [activeTab, setActiveTab] = useState('customer-basic');
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);
  
  // Multiple services state
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [currentService, setCurrentService] = useState<{
    template: ServiceTemplate | null;
    startDate: string;
    paymentDate: string;
    paymentMode: string;
    amount: string;
    duration: string;
    box: string;
    mac: string;
  }>({
    template: null,
    startDate: '',
    paymentDate: '',
    paymentMode: 'cash',
    amount: '',
    duration: '',
    box: '',
    mac: ''
  });

  // Service templates
  const serviceTemplates: ServiceTemplate[] = [
    {
      id: 'INT-PRE-001',
      name: 'Premium Internet Package',
      category: 'Internet Services',
      price: 50,
      sku: 'INT-PRE-001',
      features: ['Up to 500 Mbps', 'Unlimited Data', 'Priority Support', 'Advanced Security'],
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
      features: ['100+ Channels', 'HD Quality', 'Mobile App Access', 'DVR Recording'],
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
      features: ['Global Servers', 'No Logs Policy', 'Multiple Devices', '24/7 Security'],
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
      features: ['300+ Channels', '4K Quality', 'Sports Packages', 'Premium Content'],
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
      features: ['Up to 100 Mbps', 'Unlimited Data', 'Basic Support'],
      portalUrlTemplate: 'https://basic.internet.example.com/customer/{customerId}',
      billingUrlTemplate: 'https://billing.basic.internet.example.com/customer/{customerId}',
      defaultDuration: '12',
      requiresBox: false,
      requiresMac: false
    }
  ];

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

  // Auto-populate expiry date when payment date changes
  useEffect(() => {
    if (formData.paymentDate && selectedServices.length > 0) {
      // Calculate expiry date based on the first selected service
      const firstService = selectedServices[0];
      if (firstService) {
        const expiryDate = calculateExpiryDate(formData.paymentDate, firstService.duration);
        if (expiryDate && expiryDate !== formData.subscriptionExpiryDate) {
          setFormData(prev => ({
            ...prev,
            subscriptionExpiryDate: expiryDate
          }));
        }
      }
    }
  }, [selectedServices, formData.paymentDate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateTab = (tab: string) => {
    switch (tab) {
      case 'customer-basic':
        return formData.customerName && formData.customerPhone && formData.customerEmail;
      case 'service':
        return selectedServices.length > 0; // At least one service must be selected
      case 'payment-type':
        return formData.paymentTypeId && formData.paymentTypeName;
      case 'customer-subscription':
        return formData.customerId && formData.serviceId && formData.paymentTypeIdSub && formData.paymentDate && formData.amount;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const tabs = ['customer-basic', 'service', 'payment-type', 'customer-subscription'];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (validateTab(activeTab)) {
      if (!completedTabs.includes(activeTab)) {
        setCompletedTabs(prev => [...prev, activeTab]);
      }
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    }
  };

  const handlePrevious = () => {
    const tabs = ['customer-basic', 'service', 'payment-type', 'customer-subscription'];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTab('customer-subscription')) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    if (selectedServices.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one service' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Calculate total amount from selected services
      const totalAmount = selectedServices.reduce((sum, service) => {
        return sum + parseFloat(service.amount.replace('$', '') || '0');
      }, 0);

      // Use the first service's details for main customer record
      const primaryService = selectedServices[0];

      // Transform form data to match Customer interface
      const customerData = {
        name: formData.customerName,
        email: formData.customerEmail,
        phone: formData.customerPhone,
        address: formData.customerCounty || '',
        status: 'active' as const,
        avatar: '/images/user/user-02.png',
        role: 'customer',
        mac: primaryService.mac || '', // Use primary service MAC
        box: primaryService.box || '', // Use primary service box
        startDate: primaryService.startDate,
        paymentDate: primaryService.paymentDate,
        paymentMode: primaryService.paymentMode,
        amount: `$${totalAmount.toFixed(2)}`,
        expiryDate: formData.subscriptionExpiryDate || '',
        totalCredit: `$${totalAmount.toFixed(2)}`,
        alreadyGiven: '$0.00',
        remainingCredits: `$${totalAmount.toFixed(2)}`,
        note: formData.customerNotes || `Customer with ${selectedServices.length} services: ${selectedServices.map(s => s.template.name).join(', ')}`,
        serviceDuration: primaryService.duration
      };

      // Save customer to database
      await createCustomer(customerData);
      
      // Show success message
      setMessage({ type: 'success', text: `Customer added successfully with ${selectedServices.length} services!` });
      
      // Reset form after a short delay
      setTimeout(() => {
        setFormData({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          customerCounty: '',
          customerNotes: '',
          paymentTypeId: '',
          paymentTypeName: '',
          customerId: '',
          serviceId: '',
          paymentTypeIdSub: '',
          paymentDate: '',
          subscriptionExpiryDate: '',
          amount: ''
        });
        
        // Reset services
        setSelectedServices([]);
        setActiveTab('customer-basic');
        setCompletedTabs([]);
        
        // Navigate to customers table
        navigate('/tables');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating customer:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error adding customer. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Service management functions
  const handleAddService = () => {
    setCurrentService({
      template: null,
      startDate: '',
      paymentDate: '',
      paymentMode: 'cash',
      amount: '',
      duration: '12', // Default to 12 months
      box: '',
      mac: ''
    });
    setShowServiceModal(true);
  };

  const handleSaveService = () => {
    if (!currentService.template || !currentService.startDate || !currentService.paymentDate || !currentService.amount || !currentService.duration) {
      alert('Please fill in all required fields');
      return;
    }

    if (currentService.template.requiresBox && !currentService.box) {
      alert('Box ID is required for this service');
      return;
    }

    if (currentService.template.requiresMac && !currentService.mac) {
      alert('MAC address is required for this service');
      return;
    }

    const newService: SelectedService = {
      template: currentService.template,
      startDate: currentService.startDate,
      paymentDate: currentService.paymentDate,
      paymentMode: currentService.paymentMode,
      amount: currentService.amount,
      duration: currentService.duration,
      box: currentService.box,
      mac: currentService.mac
    };

    setSelectedServices(prev => [...prev, newService]);
    setShowServiceModal(false);
  };

  const handleRemoveService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleNextTab = () => {
    // Custom logic for navigating to the next tab
    if (activeTab === 'service') {
      // Ensure at least one service is selected
      if (selectedServices.length === 0) {
        alert('Please add at least one service before proceeding');
        return;
      }
    }
    handleNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Customer</h2>
            <p className="text-gray-600 dark:text-gray-400">Add new customer information</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  customerName: '',
                  customerPhone: '',
                  customerEmail: '',
                  customerCounty: '',
                  customerNotes: '',
                  paymentTypeId: '',
                  paymentTypeName: '',
                  customerId: '',
                  serviceId: '',
                  paymentTypeIdSub: '',
                  paymentDate: '',
                  subscriptionExpiryDate: '',
                  amount: ''
                });
                setSelectedServices([]);
                setActiveTab('customer-basic');
                setCompletedTabs([]);
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={() => navigate('/tables')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Customers
            </button>
          </div>
        </div>
      </div>

      {/* Multi-step Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'customer-basic', label: 'Customer Basic Info', icon: '👤' },
              { id: 'service', label: 'Service', icon: '⚙️' },
              { id: 'payment-type', label: 'Payment Type', icon: '💳' },
              { id: 'customer-subscription', label: 'Customer Subscription', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {completedTabs.includes(tab.id) && (
                  <span className="text-green-500">✓</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Customer Basic Info Tab */}
          {activeTab === 'customer-basic' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Basic Info</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Enter the customer's basic information</p>
              </div>

              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="customerPhone"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="customerEmail"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="customerCounty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  County
                </label>
                <input
                  type="text"
                  id="customerCounty"
                  name="customerCounty"
                  value={formData.customerCounty}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter county"
                />
              </div>

              <div>
                <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  id="customerNotes"
                  name="customerNotes"
                  rows={4}
                  value={formData.customerNotes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter customer notes"
                />
              </div>
            </div>
          )}

          {/* Service Tab */}
          {activeTab === 'service' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Customer Services</h3>
                  <p className="text-gray-600 dark:text-gray-400">Select services for the customer</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddService}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm font-medium">Add Service</span>
                </button>
              </div>

              {/* Selected Services List */}
              <div className="space-y-4">
                {selectedServices.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-gray-500 dark:text-gray-400">No services selected</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Add Service" to get started</p>
                  </div>
                ) : (
                  selectedServices.map((service, index) => (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{service.template.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{service.template.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            ${service.template.price}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveService(index)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{service.startDate}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Payment:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{service.amount}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Mode:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{service.paymentMode}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{service.duration} months</p>
                        </div>
                      </div>
                      {(service.box || service.mac) && (
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {service.box && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Box ID:</span>
                                <p className="font-medium text-gray-900 dark:text-white">{service.box}</p>
                              </div>
                            )}
                            {service.mac && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">MAC Address:</span>
                                <p className="font-medium text-gray-900 dark:text-white">{service.mac}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Service Total */}
              {selectedServices.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Services: {selectedServices.length}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Amount: ${selectedServices.reduce((sum, service) => sum + parseFloat(service.amount.replace('$', '') || '0'), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Monthly Cost: ${selectedServices.reduce((sum, service) => sum + service.template.price, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Type Tab */}
          {activeTab === 'payment-type' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Type</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Enter payment type information</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="paymentTypeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Mode *
                  </label>
                  <select
                    id="paymentTypeId"
                    name="paymentTypeId"
                    value={formData.paymentTypeId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select payment mode</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="paymentTypeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="paymentTypeName"
                    name="paymentTypeName"
                    value={formData.paymentTypeName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter payment type name"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Customer Subscription Tab */}
          {activeTab === 'customer-subscription' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Subscription</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Enter customer subscription details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customer ID *
                  </label>
                  <input
                    type="text"
                    id="customerId"
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter customer ID"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service ID *
                  </label>
                  <input
                    type="text"
                    id="serviceId"
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter service ID"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="paymentTypeIdSub" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Type ID *
                  </label>
                  <input
                    type="text"
                    id="paymentTypeIdSub"
                    name="paymentTypeIdSub"
                    value={formData.paymentTypeIdSub}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter payment type ID"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    id="paymentDate"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="subscriptionExpiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subscription Expiry Date
                  </label>
                  <input
                    type="date"
                    id="subscriptionExpiryDate"
                    name="subscriptionExpiryDate"
                    value={formData.subscriptionExpiryDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-600"
                    readOnly
                    title="This field is auto-populated based on service duration and payment date"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Auto-calculated based on service duration and payment date
                  </p>
                </div>
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter amount"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {activeTab !== 'customer-basic' && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Previous
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {activeTab !== 'customer-subscription' ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  disabled={!validateTab(activeTab)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!validateTab('customer-subscription') || isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding Customer...</span>
                    </>
                  ) : (
                    <span>Add Customer</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Service Selection Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Add Service</h2>
                <button
                  onClick={() => setShowServiceModal(false)}
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
                    Select Service Template *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviceTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          currentService.template?.id === template.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setCurrentService(prev => ({ 
                          ...prev, 
                          template,
                          duration: template.defaultDuration // Auto-populate duration from template
                        }))}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            ${template.price}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.category}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.features.slice(0, 2).map((feature, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-600 dark:text-gray-300"
                            >
                              {feature}
                            </span>
                          ))}
                          {template.features.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-600 dark:text-gray-300">
                              +{template.features.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Configuration */}
                {currentService.template && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Service Configuration</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Configure service details. Duration is pre-filled with the template default but can be customized.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={currentService.startDate}
                          onChange={(e) => setCurrentService(prev => ({ ...prev, startDate: e.target.value }))}
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
                          value={currentService.paymentDate}
                          onChange={(e) => setCurrentService(prev => ({ ...prev, paymentDate: e.target.value }))}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Payment Mode *
                        </label>
                        <select
                          value={currentService.paymentMode}
                          onChange={(e) => setCurrentService(prev => ({ ...prev, paymentMode: e.target.value }))}
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
                          Service Duration * 
                          <span className="text-xs text-gray-500 ml-1">(Default: {currentService.template.defaultDuration} months)</span>
                        </label>
                        <select
                          value={currentService.duration}
                          onChange={(e) => setCurrentService(prev => ({ ...prev, duration: e.target.value }))}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          required
                        >
                          <option value="">Select duration</option>
                          <option value="3">3 months</option>
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                          <option value="18">18 months</option>
                          <option value="24">24 months</option>
                          <option value="36">36 months</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Amount *
                        </label>
                        <input
                          type="text"
                          value={currentService.amount}
                          onChange={(e) => setCurrentService(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="$0.00"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          required
                        />
                      </div>
                      {currentService.template.requiresBox && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Box ID *
                          </label>
                          <input
                            type="text"
                            value={currentService.box}
                            onChange={(e) => setCurrentService(prev => ({ ...prev, box: e.target.value }))}
                            placeholder="Enter box ID"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            required
                          />
                        </div>
                      )}
                      {currentService.template.requiresMac && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            MAC Address *
                          </label>
                          <input
                            type="text"
                            value={currentService.mac}
                            onChange={(e) => setCurrentService(prev => ({ ...prev, mac: e.target.value }))}
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
                            {currentService.template.portalUrlTemplate.replace('{customerId}', 'CUSTOMER_ID')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Billing URL:</span>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                            {currentService.template.billingUrlTemplate.replace('{customerId}', 'CUSTOMER_ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveService}
                  disabled={!currentService.template}
                  className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    currentService.template
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
    </div>
  );
};

export default AddCustomer;
