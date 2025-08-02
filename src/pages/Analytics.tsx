import React, { useState } from 'react';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('visitors');

  const metrics = [
    { name: 'Total Visitors', value: '45,231', change: '+12.5%', trend: 'up' },
    { name: 'Page Views', value: '87,945', change: '+8.2%', trend: 'up' },
    { name: 'Bounce Rate', value: '34.2%', change: '-2.1%', trend: 'down' },
    { name: 'Session Duration', value: '2m 45s', change: '+15.3%', trend: 'up' },
  ];

  const topPages = [
    { page: '/dashboard', views: 12450, percentage: 28.5 },
    { page: '/products', views: 9234, percentage: 21.1 },
    { page: '/analytics', views: 7891, percentage: 18.0 },
    { page: '/orders', views: 5678, percentage: 13.0 },
    { page: '/customers', views: 4321, percentage: 9.9 },
  ];

  const trafficSources = [
    { source: 'Organic Search', visitors: 18450, percentage: 40.8 },
    { source: 'Direct', visitors: 12670, percentage: 28.0 },
    { source: 'Social Media', visitors: 7890, percentage: 17.4 },
    { source: 'Email', visitors: 3456, percentage: 7.6 },
    { source: 'Referral', visitors: 2765, percentage: 6.1 },
  ];

  const countries = [
    { name: 'United States', visitors: 15678, flag: '🇺🇸' },
    { name: 'United Kingdom', visitors: 8234, flag: '🇬🇧' },
    { name: 'Canada', visitors: 6789, flag: '🇨🇦' },
    { name: 'Germany', visitors: 5432, flag: '🇩🇪' },
    { name: 'France', visitors: 4321, flag: '🇫🇷' },
  ];

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400">Track your website performance and user behavior</p>
          </div>
          <div className="flex items-center space-x-2">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.name}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metric.value}</p>
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(metric.trend)}
                <span className={`text-sm font-medium ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitors Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visitors Overview</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedMetric('visitors')}
                className={`px-3 py-1 rounded-md text-sm ${
                  selectedMetric === 'visitors'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Visitors
              </button>
              <button
                onClick={() => setSelectedMetric('pageviews')}
                className={`px-3 py-1 rounded-md text-sm ${
                  selectedMetric === 'pageviews'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Page Views
              </button>
            </div>
          </div>
          <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Interactive Chart Placeholder</p>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Traffic Sources</h3>
          <div className="space-y-4">
            {trafficSources.map((source) => (
              <div key={source.source} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{source.source}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{source.visitors.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${source.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{source.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Pages and Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Pages</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topPages.map((page) => (
                <div key={page.page} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{page.page}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{page.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${page.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{page.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Countries</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {countries.map((country) => (
                <div key={country.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{country.flag}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{country.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{country.visitors.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Activity</h3>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">42 active users</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900 dark:text-white">User from New York visited /dashboard</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">2s ago</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900 dark:text-white">Purchase completed for $299</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">5s ago</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900 dark:text-white">User from London viewed product page</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">8s ago</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900 dark:text-white">New user signed up</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">12s ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
