import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCustomerById, updateCustomer, Customer, recalculateCreditsOnPaymentDateChange } from '../data/customersDB';
import { formatCreditAmount } from '../utils/creditFormatter';

const EditCustomer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    mac: '',
    box: '',
    startDate: '',
    paymentDate: '',
    paymentMode: '',
    amount: '',
    expiryDate: '',
    totalCredit: '',
    alreadyGiven: '',
    remainingCredits: '',
    note: '',
    serviceDuration: '',
    role: '',
    status: 'active' as 'active' | 'inactive' | 'pending'
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        if (id) {
          const customer = await getCustomerById(id);
          if (customer) {
            setCustomerData(customer);
            setFormData({
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              mac: customer.mac,
              box: customer.box,
              startDate: customer.startDate,
              paymentDate: customer.paymentDate,
              paymentMode: customer.paymentMode,
              amount: customer.amount,
              expiryDate: customer.expiryDate,
              totalCredit: formatCreditAmount(customer.totalCredit),
              alreadyGiven: formatCreditAmount(customer.alreadyGiven),
              remainingCredits: formatCreditAmount(customer.remainingCredits),
              note: customer.note,
              serviceDuration: customer.serviceDuration,
              role: customer.role,
              status: customer.status
            });
          } else {
            setError('Customer not found');
          }
        }
      } catch (err) {
        setError('Error loading customer data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

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

  // Auto-populate expiry date when service duration or payment date changes
  useEffect(() => {
    if (formData.serviceDuration && formData.paymentDate) {
      const newExpiryDate = calculateExpiryDate(formData.paymentDate, formData.serviceDuration);
      if (newExpiryDate && newExpiryDate !== formData.expiryDate) {
        setFormData(prev => ({
          ...prev,
          expiryDate: newExpiryDate
        }));
      }
    }
  }, [formData.serviceDuration, formData.paymentDate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
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
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
      return;
    }
    
    // Handle payment date change with credit recalculation
    if (name === 'paymentDate' && value !== formData.paymentDate && customerData) {
      const recalculatedCredits = recalculateCreditsOnPaymentDateChange(customerData, value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        alreadyGiven: formatCreditAmount(recalculatedCredits.alreadyGiven),
        remainingCredits: formatCreditAmount(recalculatedCredits.remainingCredits),
        expiryDate: recalculatedCredits.expiryDate
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (id) {
        const updatedCustomer = await updateCustomer(id, formData);
        if (updatedCustomer) {
          // Navigate back to customer detail page
          navigate(`/customer/${id}`);
        } else {
          setError('Failed to update customer');
        }
      }
    } catch (err) {
      setError('Error updating customer');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/customer/${id}`);
  };

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
            The customer you're trying to edit doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/tables')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
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
                  Edit Customer
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Customer ID: {customerData.id} • {customerData.name}
                </p>
              </div>
            </div>
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

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email*
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone*
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role*
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Role</option>
                <option value="Premium Customer">Premium Customer</option>
                <option value="Standard Customer">Standard Customer</option>
                <option value="Basic Customer">Basic Customer</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status*
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Technical Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Technical Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="mac" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                MAC Address*
              </label>
              <input
                type="text"
                id="mac"
                name="mac"
                value={formData.mac}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="box" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Box ID*
              </label>
              <input
                type="text"
                id="box"
                name="box"
                value={formData.box}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date*
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiry Date*
              </label>
              <input
                type="date"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Auto-calculated when service duration and payment date are set
              </p>
            </div>
            <div>
              <label htmlFor="serviceDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Duration
              </label>
              <select
                id="serviceDuration"
                name="serviceDuration"
                value={formData.serviceDuration}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select duration</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="18">18 months</option>
                <option value="24">24 months</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Date*
              </label>
              <input
                type="date"
                id="paymentDate"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                💡 Credits will be automatically recalculated when payment date changes
              </p>
            </div>
            <div>
              <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Mode*
              </label>
              <select
                id="paymentMode"
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Payment Mode</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="PayPal">PayPal</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount*
              </label>
              <input
                type="text"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                placeholder="$0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Credit Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Credit Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="totalCredit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Credit*
              </label>
              <input
                type="text"
                id="totalCredit"
                name="totalCredit"
                value={formData.totalCredit}
                onChange={handleInputChange}
                required
                placeholder="$0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="alreadyGiven" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Already Given*
              </label>
              <input
                type="text"
                id="alreadyGiven"
                name="alreadyGiven"
                value={formData.alreadyGiven}
                onChange={handleInputChange}
                required
                placeholder="$0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="remainingCredits" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remaining Credits*
              </label>
              <input
                type="text"
                id="remainingCredits"
                name="remainingCredits"
                value={formData.remainingCredits}
                onChange={handleInputChange}
                required
                placeholder="$0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Notes
          </h3>
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Notes
            </label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add any notes about this customer..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCustomer;
