const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const customerRepository = require('../repositories/customerRepository');
const { getSupabaseServiceClient } = require('../config/supabase');

const today = new Date();

const offsetDate = (days) => {
  const value = new Date(today);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

const demoCustomers = [
  {
    name: 'Customer User',
    email: 'user@example.com',
    phone: '+919468001291',
    whatsappNumber: '+919468001291',
    address: 'Sector 21 Road 5',
    city: 'Gurugram',
    country: 'India',
    status: 'active',
    role: 'Household Premium',
    startDate: offsetDate(-150),
    paymentDate: offsetDate(-30),
    paymentMode: 'Bank Transfer',
    amount: '75.00',
    expiryDate: offsetDate(5),
    totalCredit: '150.00',
    alreadyGiven: '75.00',
    remainingCredits: '75.00',
    note: 'Portal demo user with two live services and due-soon renewal.',
    serviceDuration: '6',
    box: 'BOX-U001',
    mac: 'AA:11:22:33:44:55',
    portalPassword: 'user123',
    services: [
      {
        templateId: 'IPTV-PRE-001',
        planCode: 'IPTV-PRE-001',
        name: 'IPTV Premium Package',
        category: 'TV Services',
        sku: 'IPTV-PRE-001',
        description: 'Premium IPTV package with sports and 4K channels.',
        features: ['300+ Channels', '4K Quality', 'Sports Packages', 'Premium Content'],
        paymentMode: 'Bank Transfer',
        amount: '60.00',
        durationMonths: '6',
        startDate: offsetDate(-150),
        paymentDate: offsetDate(-30),
        expiryDate: offsetDate(5),
        box: 'BOX-U001',
        mac: 'AA:11:22:33:44:55',
        portalUrl: 'https://portal.streamops.example/customer-user/iptv',
        billingUrl: 'https://billing.streamops.example/customer-user/iptv',
        maxConnections: 2,
        transactionId: '',
        serviceCode: 'SRV-USER-01'
      },
      {
        templateId: 'VPN-001',
        planCode: 'VPN-001',
        name: 'VPN Service',
        category: 'Security Services',
        sku: 'VPN-001',
        description: 'Multi-device VPN access.',
        features: ['Global Servers', 'No Logs Policy', 'Multiple Devices'],
        paymentMode: 'Bank Transfer',
        amount: '15.00',
        durationMonths: '12',
        startDate: offsetDate(-90),
        paymentDate: offsetDate(-30),
        expiryDate: offsetDate(95),
        portalUrl: 'https://portal.streamops.example/customer-user/vpn',
        billingUrl: 'https://billing.streamops.example/customer-user/vpn',
        maxConnections: 5,
        transactionId: '',
        serviceCode: 'SRV-USER-02'
      }
    ]
  },
  {
    name: 'Clara Verma',
    email: 'clara.verma@example.com',
    phone: '+919468001292',
    whatsappNumber: '+919468001292',
    address: 'Palm Residency, Flat 904',
    city: 'Jaipur',
    country: 'India',
    status: 'active',
    role: 'Entertainment Basic',
    startDate: offsetDate(-60),
    paymentDate: offsetDate(-14),
    paymentMode: 'Cash',
    amount: '30.00',
    expiryDate: offsetDate(16),
    totalCredit: '30.00',
    alreadyGiven: '0.00',
    remainingCredits: '30.00',
    note: 'Single-service customer with upcoming payment window.',
    serviceDuration: '1',
    box: 'BOX-C101',
    mac: 'AA:11:22:33:44:56',
    services: [
      {
        templateId: 'IPTV-BAS-001',
        planCode: 'IPTV-BAS-001',
        name: 'IPTV Basic Package',
        category: 'TV Services',
        sku: 'IPTV-BAS-001',
        description: 'Family IPTV package for standard use.',
        features: ['100+ Channels', 'HD Quality', 'Mobile App Access'],
        paymentMode: 'Cash',
        amount: '30.00',
        durationMonths: '1',
        startDate: offsetDate(-30),
        paymentDate: offsetDate(-14),
        expiryDate: offsetDate(16),
        box: 'BOX-C101',
        mac: 'AA:11:22:33:44:56',
        portalUrl: 'https://portal.streamops.example/clara/iptv',
        billingUrl: 'https://billing.streamops.example/clara/iptv',
        maxConnections: 1,
        transactionId: '',
        serviceCode: 'SRV-CLARA-01'
      }
    ]
  },
  {
    name: 'Mohit Saini',
    email: 'mohit.saini@example.com',
    phone: '+919468001293',
    whatsappNumber: '+919468001293',
    address: 'Tech Enclave, Tower B',
    city: 'Noida',
    country: 'India',
    status: 'pending',
    role: 'Hybrid Customer',
    startDate: offsetDate(-10),
    paymentDate: offsetDate(-3),
    paymentMode: 'Credit Card',
    amount: '85.00',
    expiryDate: offsetDate(27),
    totalCredit: '85.00',
    alreadyGiven: '0.00',
    remainingCredits: '85.00',
    note: 'Pending activation with bundled internet and IPTV services.',
    serviceDuration: '1',
    box: 'BOX-M221',
    mac: 'AA:11:22:33:44:57',
    services: [
      {
        templateId: 'INT-PRE-001',
        planCode: 'INT-PRE-001',
        name: 'Premium Internet Package',
        category: 'Internet Services',
        sku: 'INT-PRE-001',
        description: 'High-speed internet for the household.',
        features: ['Up to 500 Mbps', 'Unlimited Data', 'Priority Support'],
        paymentMode: 'Credit Card',
        amount: '50.00',
        durationMonths: '1',
        startDate: offsetDate(-10),
        paymentDate: offsetDate(-3),
        expiryDate: offsetDate(27),
        box: 'ONT-M221',
        mac: 'AA:11:22:33:44:67',
        portalUrl: 'https://portal.streamops.example/mohit/internet',
        billingUrl: 'https://billing.streamops.example/mohit/internet',
        maxConnections: 2,
        transactionId: '',
        serviceCode: 'SRV-MOHIT-01'
      },
      {
        templateId: 'IPTV-BAS-001',
        planCode: 'IPTV-BAS-001',
        name: 'IPTV Basic Package',
        category: 'TV Services',
        sku: 'IPTV-BAS-001',
        description: 'Bundle TV service.',
        features: ['100+ Channels', 'HD Quality', 'Mobile App Access'],
        paymentMode: 'Credit Card',
        amount: '35.00',
        durationMonths: '1',
        startDate: offsetDate(-10),
        paymentDate: offsetDate(-3),
        expiryDate: offsetDate(27),
        box: 'BOX-M221',
        mac: 'AA:11:22:33:44:57',
        portalUrl: 'https://portal.streamops.example/mohit/iptv',
        billingUrl: 'https://billing.streamops.example/mohit/iptv',
        maxConnections: 1,
        transactionId: '',
        serviceCode: 'SRV-MOHIT-02'
      }
    ]
  },
  {
    name: 'Sana Kapoor',
    email: 'sana.kapoor@example.com',
    phone: '+919468001294',
    whatsappNumber: '+919468001294',
    address: 'Green Court, Villa 12',
    city: 'Chandigarh',
    country: 'India',
    status: 'inactive',
    role: 'Expired Account',
    startDate: offsetDate(-220),
    paymentDate: offsetDate(-45),
    paymentMode: 'PayPal',
    amount: '25.00',
    expiryDate: offsetDate(-2),
    totalCredit: '25.00',
    alreadyGiven: '25.00',
    remainingCredits: '0.00',
    note: 'Expired internet-only customer awaiting renewal.',
    serviceDuration: '1',
    services: [
      {
        templateId: 'INT-BAS-001',
        planCode: 'INT-BAS-001',
        name: 'Basic Internet Package',
        category: 'Internet Services',
        sku: 'INT-BAS-001',
        description: 'Expired entry-level internet service.',
        features: ['Up to 100 Mbps', 'Unlimited Data'],
        paymentMode: 'PayPal',
        amount: '25.00',
        durationMonths: '1',
        startDate: offsetDate(-32),
        paymentDate: offsetDate(-45),
        expiryDate: offsetDate(-2),
        portalUrl: 'https://portal.streamops.example/sana/internet',
        billingUrl: 'https://billing.streamops.example/sana/internet',
        maxConnections: 1,
        transactionId: '',
        serviceCode: 'SRV-SANA-01',
        status: 'expired'
      }
    ]
  },
  {
    name: 'Rajesh Nanda',
    email: 'rajesh.nanda@example.com',
    phone: '+919468001295',
    whatsappNumber: '+919468001295',
    address: 'Royal Heights, 18th Floor',
    city: 'Pune',
    country: 'India',
    status: 'active',
    role: 'Power User',
    startDate: offsetDate(-365),
    paymentDate: offsetDate(-7),
    paymentMode: 'Debit Card',
    amount: '125.00',
    expiryDate: offsetDate(23),
    totalCredit: '250.00',
    alreadyGiven: '125.00',
    remainingCredits: '125.00',
    note: 'Power user with IPTV, premium internet, and VPN.',
    serviceDuration: '1',
    box: 'BOX-R900',
    mac: 'AA:11:22:33:44:58',
    services: [
      {
        templateId: 'IPTV-PRE-001',
        planCode: 'IPTV-PRE-001',
        name: 'IPTV Premium Package',
        category: 'TV Services',
        sku: 'IPTV-PRE-001',
        description: 'Premium entertainment package.',
        features: ['300+ Channels', '4K Quality', 'Premium Content'],
        paymentMode: 'Debit Card',
        amount: '60.00',
        durationMonths: '1',
        startDate: offsetDate(-7),
        paymentDate: offsetDate(-7),
        expiryDate: offsetDate(23),
        box: 'BOX-R900',
        mac: 'AA:11:22:33:44:58',
        portalUrl: 'https://portal.streamops.example/rajesh/iptv',
        billingUrl: 'https://billing.streamops.example/rajesh/iptv',
        maxConnections: 2,
        transactionId: '',
        serviceCode: 'SRV-RAJESH-01'
      },
      {
        templateId: 'INT-PRE-001',
        planCode: 'INT-PRE-001',
        name: 'Premium Internet Package',
        category: 'Internet Services',
        sku: 'INT-PRE-001',
        description: 'Premium high-speed internet.',
        features: ['Up to 500 Mbps', 'Unlimited Data', 'Priority Support'],
        paymentMode: 'Debit Card',
        amount: '50.00',
        durationMonths: '1',
        startDate: offsetDate(-7),
        paymentDate: offsetDate(-7),
        expiryDate: offsetDate(23),
        box: 'ONT-R900',
        mac: 'AA:11:22:33:44:68',
        portalUrl: 'https://portal.streamops.example/rajesh/internet',
        billingUrl: 'https://billing.streamops.example/rajesh/internet',
        maxConnections: 2,
        transactionId: '',
        serviceCode: 'SRV-RAJESH-02'
      },
      {
        templateId: 'VPN-001',
        planCode: 'VPN-001',
        name: 'VPN Service',
        category: 'Security Services',
        sku: 'VPN-001',
        description: 'VPN for remote access and privacy.',
        features: ['Global Servers', 'No Logs Policy', 'Multiple Devices'],
        paymentMode: 'Debit Card',
        amount: '15.00',
        durationMonths: '1',
        startDate: offsetDate(-7),
        paymentDate: offsetDate(-7),
        expiryDate: offsetDate(23),
        portalUrl: 'https://portal.streamops.example/rajesh/vpn',
        billingUrl: 'https://billing.streamops.example/rajesh/vpn',
        maxConnections: 5,
        transactionId: '',
        serviceCode: 'SRV-RAJESH-03'
      }
    ]
  }
];

const setSpecificPortalPassword = async (customerId, password) => {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from('customers')
    .update({
      portal_password_hash: await bcrypt.hash(password, 12),
      portal_access_enabled: true,
      portal_reset_required: true
    })
    .eq('id', customerId);

  if (error) {
    throw new Error(error.message || 'Unable to set portal password');
  }
};

const ensureCustomer = async (entry) => {
  const existing = await customerRepository.findByEmail(entry.email);

  if (existing) {
    if (entry.portalPassword) {
      await setSpecificPortalPassword(existing.id, entry.portalPassword);
    }

    return { action: 'existing', customer: existing };
  }

  const created = await customerRepository.create(entry);
  return { action: 'created', customer: created };
};

const run = async () => {
  const results = [];

  for (const entry of demoCustomers) {
    const result = await ensureCustomer(entry);
    results.push({
      action: result.action,
      email: entry.email,
      customerCode: result.customer.customerCode,
      serviceId: result.customer.serviceId,
      portalPassword:
        entry.email === 'user@example.com'
          ? 'user123'
          : result.customer.portalSetup?.temporaryPassword || 'already-set'
    });
  }

  console.log('Demo customers ready:');
  console.log(JSON.stringify(results, null, 2));
};

run().catch((error) => {
  console.error(`Failed to seed demo customers: ${error.message}`);
  process.exit(1);
});
