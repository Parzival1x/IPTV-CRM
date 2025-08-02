import { useState } from 'react';
import { formatCreditAmount } from '../utils/creditFormatter';

const ECommerce = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const services = [
    { 
      id: 1, 
      name: 'Basic Internet Package', 
      category: 'Internet Services', 
      price: 25, 
      duration: '12 months',
      status: 'Active', 
      subscribers: 1205,
      description: 'High-speed internet connection for home and small office use',
      features: ['Up to 100 Mbps', 'No Data Caps', 'Basic Support', 'Easy Setup'],
      portalUrl: 'https://internet.example.com',
      billingUrl: 'https://billing.internet.example.com',
      sku: 'INT-BAS-001'
    },
    { 
      id: 2, 
      name: 'Premium Internet Package', 
      category: 'Internet Services', 
      price: 50, 
      duration: '12 months',
      status: 'Active', 
      subscribers: 2345,
      description: 'Ultra-fast internet with premium support and enhanced features',
      features: ['Up to 500 Mbps', 'Unlimited Data', 'Priority Support', 'Advanced Security'],
      portalUrl: 'https://premium.internet.example.com',
      billingUrl: 'https://billing.premium.internet.example.com',
      sku: 'INT-PRE-001'
    },
    { 
      id: 3, 
      name: 'IPTV Basic Package', 
      category: 'TV Services', 
      price: 30, 
      duration: '12 months',
      status: 'Active', 
      subscribers: 876,
      description: 'Essential TV package with popular channels and streaming capabilities',
      features: ['100+ Channels', 'HD Quality', 'Mobile App Access', 'DVR Recording'],
      portalUrl: 'https://iptv.basic.example.com',
      billingUrl: 'https://billing.iptv.basic.example.com',
      sku: 'IPTV-BAS-001'
    },
    { 
      id: 4, 
      name: 'IPTV Premium Package', 
      category: 'TV Services', 
      price: 60, 
      duration: '12 months',
      status: 'Active', 
      subscribers: 567,
      description: 'Premium TV experience with sports, movies, and international channels',
      features: ['300+ Channels', '4K Quality', 'Multi-Device Access', 'Premium Sports'],
      portalUrl: 'https://iptv.premium.example.com',
      billingUrl: 'https://billing.iptv.premium.example.com',
      sku: 'IPTV-PRE-001'
    },
    { 
      id: 5, 
      name: 'Combo Internet + TV', 
      category: 'Bundle Services', 
      price: 75, 
      duration: '12 months',
      status: 'Active', 
      subscribers: 1421,
      description: 'Best value bundle combining high-speed internet and TV services',
      features: ['Premium Internet', 'IPTV Basic', 'Bundled Support', 'Cost Savings'],
      portalUrl: 'https://combo.example.com',
      billingUrl: 'https://billing.combo.example.com',
      sku: 'COMBO-001'
    },
    { 
      id: 6, 
      name: 'VPN Service', 
      category: 'Security Services', 
      price: 15, 
      duration: '12 months',
      status: 'Active', 
      subscribers: 892,
      description: 'Secure VPN service for privacy and security online',
      features: ['Global Servers', 'No Logs Policy', 'Multiple Devices', '24/7 Security'],
      portalUrl: 'https://vpn.example.com',
      billingUrl: 'https://billing.vpn.example.com',
      sku: 'VPN-001'
    },
    { 
      id: 7, 
      name: 'Cloud Storage', 
      category: 'Storage Services', 
      price: 20, 
      duration: '12 months',
      status: 'Active', 
      subscribers: 1156,
      description: 'Secure cloud storage solution for your files and data',
      features: ['1TB Storage', 'File Sync', 'Backup Solutions', 'Cross-Platform Access'],
      portalUrl: 'https://storage.example.com',
      billingUrl: 'https://billing.storage.example.com',
      sku: 'CLOUD-001'
    },
    { 
      id: 8, 
      name: 'Technical Support', 
      category: 'Support Services', 
      price: 10, 
      duration: '12 months',
      status: 'Active', 
      subscribers: 634,
      description: 'Professional technical support for all your service needs',
      features: ['24/7 Support', 'Remote Assistance', 'Priority Queue', 'Expert Technicians'],
      portalUrl: 'https://support.example.com',
      billingUrl: 'https://billing.support.example.com',
      sku: 'TECH-SUP-001'
    },
  ];

  const orders = [
    { 
      id: '#12345', 
      customer: 'John Doe', 
      customerEmail: 'john@example.com',
      date: '2024-01-15', 
      total: 75, 
      status: 'Delivered',
      paymentMethod: 'Credit Card',
      shippingAddress: '123 Main St, New York, NY 10001',
      orderItems: [
        { name: 'Combo Internet + TV', quantity: 1, price: 75 }
      ],
      trackingNumber: 'TN123456789',
      estimatedDelivery: '2024-01-18',
      notes: 'Service activation completed'
    },
    { 
      id: '#12346', 
      customer: 'Jane Smith', 
      customerEmail: 'jane@example.com',
      date: '2024-01-14', 
      total: 50, 
      status: 'Shipped',
      paymentMethod: 'PayPal',
      shippingAddress: '456 Oak Ave, Los Angeles, CA 90210',
      orderItems: [
        { name: 'Premium Internet Package', quantity: 1, price: 50 }
      ],
      trackingNumber: 'TN123456790',
      estimatedDelivery: '2024-01-19',
      notes: 'Equipment shipped, awaiting installation'
    },
    { 
      id: '#12347', 
      customer: 'Bob Johnson', 
      customerEmail: 'bob@example.com',
      date: '2024-01-13', 
      total: 60, 
      status: 'Processing',
      paymentMethod: 'Bank Transfer',
      shippingAddress: '789 Pine St, Chicago, IL 60601',
      orderItems: [
        { name: 'IPTV Premium Package', quantity: 1, price: 60 }
      ],
      trackingNumber: null,
      estimatedDelivery: '2024-01-20',
      notes: 'Awaiting payment confirmation'
    },
    { 
      id: '#12348', 
      customer: 'Alice Brown', 
      customerEmail: 'alice@example.com',
      date: '2024-01-12', 
      total: 45, 
      status: 'Pending',
      paymentMethod: 'Credit Card',
      shippingAddress: '321 Elm St, Houston, TX 77001',
      orderItems: [
        { name: 'IPTV Basic Package', quantity: 1, price: 30 },
        { name: 'VPN Service', quantity: 1, price: 15 }
      ],
      trackingNumber: null,
      estimatedDelivery: '2024-01-22',
      notes: 'Waiting for technical setup'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Limited Availability': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Unavailable': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Shipped': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Processing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {['overview', 'services', 'orders', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">$45,231</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">+20.1%</span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">from last month</span>
            </div>
          </div>

          {/* Orders Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">2,451</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">+180.1%</span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">from last month</span>
            </div>
          </div>

          {/* Services Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">2,072</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">-19%</span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">from last month</span>
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Users</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">15,023</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">+19%</span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">from last month</span>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{service.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{service.category}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">${formatCreditAmount(service.price)}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Service Information */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                    Service Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Service Name
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{service.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{service.category}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Duration
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{service.duration}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Active Subscribers
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{service.subscribers.toLocaleString()}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{service.description}</p>
                    </div>
                  </div>
                </div>

                {/* Service Features */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 p-4 border-b border-gray-200 dark:border-gray-700">
                    Service Features
                  </h4>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {service.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-900 dark:text-white">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Service URLs & Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                      Service Access
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Portal URL
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 flex-1">
                            <p className="text-gray-900 dark:text-gray-100 font-mono text-sm truncate">{service.portalUrl}</p>
                          </div>
                          <div className="flex items-center text-blue-600 dark:text-blue-400">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="text-xs">Open</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Billing URL
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 flex-1">
                            <p className="text-gray-900 dark:text-gray-100 font-mono text-sm truncate">{service.billingUrl}</p>
                          </div>
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                      Pricing & Statistics
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Service Price</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">${service.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Duration</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{service.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Active Subscribers</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{service.subscribers.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                        <div className="flex justify-between">
                          <span className="text-base font-semibold text-gray-900 dark:text-white">Monthly Revenue</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">${(service.price * service.subscribers).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                      Edit Service
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      Manage Subscribers
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                      View Analytics
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                      Add New Service
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Order {order.id}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{order.date}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">${order.total}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Customer Information */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Customer Name
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{order.customer}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{order.customerEmail}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shipping Address
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{order.shippingAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 p-4 border-b border-gray-200 dark:border-gray-700">
                    Order Items
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {order.orderItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              ${item.price}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              ${item.price * item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                      Payment & Shipping Details
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Payment Method
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{order.paymentMethod}</p>
                          </div>
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-xs">Verified</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tracking Number
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-900 dark:text-gray-100 font-mono">{order.trackingNumber || 'Not assigned'}</p>
                          </div>
                          {order.trackingNumber && (
                            <div className="flex items-center text-blue-600 dark:text-blue-400">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs">Track</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Estimated Delivery
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">{order.estimatedDelivery}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                      Order Summary
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Subtotal</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">${order.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Shipping</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Free</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Tax</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">$0.00</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                        <div className="flex justify-between">
                          <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">${order.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                      Order Notes
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300">{order.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                      Print Invoice
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      Update Status
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                      Contact Customer
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                      Ship Order
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales Overview</h3>
            <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Sales Chart Placeholder</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Categories</h3>
            <div className="space-y-4">
              {['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'].map((category, index) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{category}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${85 - index * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">{85 - index * 10}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ECommerce;
