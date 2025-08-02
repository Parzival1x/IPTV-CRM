import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import ECommerce from "./pages/ECommerce";
import Analytics from "./pages/Analytics";
import Calendar from "./pages/Calendar";
import AddCustomer from "./pages/Forms";
import Customers from "./pages/Tables";
import CustomerDetail from "./pages/CustomerDetail";
import Profile from "./pages/Profile";
import Charts from "./pages/Charts";
import UIElements from "./pages/UIElements";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ProtectedRoute from "./components/ProtectedRoute";
import { initializeAuth, authService } from "./services/auth";

// Simple Arrow Icons
const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ArrowDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// Helper functions for avatar initials
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

// Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Check if user is logged in
    const userData = authService.getCurrentUser();
    if (userData) {
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    authService.signOut();
    setUser(null);
    setShowProfileDropdown(false);
    // Force a hard redirect to sign in page
    window.location.href = '/signin';
  };
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'eCommerce', href: '/ecommerce', icon: '🛒' },
    { name: 'Analytics', href: '/analytics', icon: '📈' },
    { name: 'Calendar', href: '/calendar', icon: '📅' },
    { name: 'Profile', href: '/profile', icon: '👤' },
    { name: 'Tasks', href: '/tasks', icon: '✅' },
    { name: 'Add Customer', href: '/forms', icon: '📝' },
    { name: 'Customers', href: '/tables', icon: '📋' },
    { name: 'UI Elements', href: '/ui-elements', icon: '🎨' },
    { name: 'Charts', href: '/charts', icon: '📊' },
    { name: 'Authentication', href: '/auth', icon: '🔐' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg">
        <div className="p-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold text-gray-800 dark:text-white">TailAdmin</span>
          </Link>
        </div>
        
        <nav className="mt-8">
          <div className="px-6 py-3">
            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Menu</span>
          </div>
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-6 py-3 text-sm font-medium ${
                  location.pathname === item.href
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user ? `Welcome back, ${user.name}!` : 'Welcome back!'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getAvatarColor(user.name)}`}>
                        {user.avatar ? (
                          <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-sm">{getInitials(user.name)}</span>
                        )}
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                        <div className="py-2">
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setShowProfileDropdown(false)}
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>My Profile</span>
                            </div>
                          </Link>
                          <Link
                            to="/settings"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setShowProfileDropdown(false)}
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>Settings</span>
                            </div>
                          </Link>
                          <hr className="my-2 border-gray-200 dark:border-gray-700" />
                          <button
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              <span>Sign Out</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/signin"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Dashboard Page
const Dashboard = () => (
  <div className="grid grid-cols-12 gap-6">
    {/* Metrics Cards */}
    <div className="col-span-12 lg:col-span-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Customers Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Customers</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">3,782</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <ArrowUpIcon className="w-3 h-3 mr-1" />
              11.01%
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">vs last month</span>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Orders</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">5,359</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <ArrowUpIcon className="w-3 h-3 mr-1" />
              9.05%
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">vs last month</span>
          </div>
        </div>
      </div>

      {/* Monthly Sales Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Sales</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Chart placeholder</p>
        </div>
      </div>
    </div>

    {/* Monthly Target */}
    <div className="col-span-12 lg:col-span-5">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Target</h3>
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <div className="w-full h-full bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">75.55%</div>
                <div className="text-xs text-green-600 dark:text-green-400">+10%</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You earn $3287 today, it's higher than last month. Keep up your good work!
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target</span>
              <span className="font-semibold text-gray-900 dark:text-white">$20K</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Revenue</span>
              <span className="font-semibold text-gray-900 dark:text-white">$20K</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Today</span>
              <span className="font-semibold text-gray-900 dark:text-white">$20K</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Statistics Chart */}
    <div className="col-span-12">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statistics</h3>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">Overview</button>
            <button className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Sales</button>
            <button className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Revenue</button>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Chart placeholder</p>
        </div>
      </div>
    </div>

    {/* Demographics and Recent Orders */}
    <div className="col-span-12 lg:col-span-5">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customers Demographic</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-4 bg-blue-600 rounded-sm"></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">USA</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">2,379 Customers</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">79%</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-4 bg-green-600 rounded-sm"></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">France</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">589 Customers</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">23%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Recent Orders */}
    <div className="col-span-12 lg:col-span-7">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">See all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Product</th>
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Category</th>
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Price</th>
                <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">Macbook pro 13"</td>
                <td className="py-3 text-sm text-gray-600 dark:text-gray-400">Laptop</td>
                <td className="py-3 text-sm text-gray-600 dark:text-gray-400">$2399.00</td>
                <td className="py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    Delivered
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">Apple Watch Ultra</td>
                <td className="py-3 text-sm text-gray-600 dark:text-gray-400">Watch</td>
                <td className="py-3 text-sm text-gray-600 dark:text-gray-400">$879.00</td>
                <td className="py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    Pending
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">iPhone 15 Pro Max</td>
                <td className="py-3 text-sm text-gray-600 dark:text-gray-400">SmartPhone</td>
                <td className="py-3 text-sm text-gray-600 dark:text-gray-400">$1869.00</td>
                <td className="py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    Delivered
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

// Generic Page Component
const GenericPage = ({ title, description }: { title: string; description: string }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Feature 1</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">This is a sample feature card.</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Feature 2</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">This is another sample feature card.</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Feature 3</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">This is a third sample feature card.</p>
        </div>
      </div>
    </div>
  </div>
);

// AuthWrapper component to handle routes that don't need the layout
const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export default function App() {
  // Initialize authentication and database on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Auth routes (without layout) */}
        <Route path="/signin" element={<AuthWrapper><SignIn /></AuthWrapper>} />
        <Route path="/signup" element={<AuthWrapper><SignUp /></AuthWrapper>} />
        <Route path="/forgot-password" element={<AuthWrapper><GenericPage title="Forgot Password" description="Reset your password" /></AuthWrapper>} />
        
        {/* Protected routes (with layout) */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/ecommerce" element={<ECommerce />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/marketing" element={<GenericPage title="Marketing" description="Marketing campaigns and customer engagement tools." />} />
                <Route path="/crm" element={<GenericPage title="CRM" description="Customer relationship management system." />} />
                <Route path="/stocks" element={<GenericPage title="Stocks" description="Stock market tracking and portfolio management." />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/tasks" element={<GenericPage title="Tasks" description="Task management and project tracking." />} />
                <Route path="/forms" element={<AddCustomer />} />
                <Route path="/tables" element={<Customers />} />
                <Route path="/customer/:id" element={<CustomerDetail />} />
                <Route path="/pages" element={<GenericPage title="Pages" description="Various page templates and layouts." />} />
                <Route path="/ui-elements" element={<UIElements />} />
                <Route path="/charts" element={<Charts />} />
                <Route path="/auth" element={<GenericPage title="Authentication" description="Login, registration, and user authentication." />} />
                <Route path="/settings" element={<GenericPage title="Settings" description="User settings and preferences." />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
