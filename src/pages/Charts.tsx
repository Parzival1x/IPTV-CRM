import React, { useState } from 'react';

const Charts = () => {
  const [activeChart, setActiveChart] = useState('overview');

  const chartTypes = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'line', name: 'Line Charts', icon: '📈' },
    { id: 'bar', name: 'Bar Charts', icon: '📊' },
    { id: 'pie', name: 'Pie Charts', icon: '🥧' },
    { id: 'area', name: 'Area Charts', icon: '📉' },
    { id: 'scatter', name: 'Scatter Plots', icon: '⭐' },
  ];

  const data = {
    sales: [
      { month: 'Jan', value: 12000 },
      { month: 'Feb', value: 19000 },
      { month: 'Mar', value: 15000 },
      { month: 'Apr', value: 25000 },
      { month: 'May', value: 22000 },
      { month: 'Jun', value: 30000 },
    ],
    categories: [
      { name: 'Electronics', value: 35, color: 'bg-blue-500' },
      { name: 'Clothing', value: 25, color: 'bg-green-500' },
      { name: 'Books', value: 20, color: 'bg-yellow-500' },
      { name: 'Sports', value: 12, color: 'bg-red-500' },
      { name: 'Other', value: 8, color: 'bg-purple-500' },
    ],
    traffic: [
      { source: 'Direct', visitors: 4520, percentage: 45 },
      { source: 'Social', visitors: 2310, percentage: 23 },
      { source: 'Search', visitors: 1890, percentage: 19 },
      { source: 'Email', visitors: 1320, percentage: 13 },
    ],
  };

  const generateBarChart = (data: any[], height = 200) => {
    const maxValue = Math.max(...data.map(d => d.value));
    return (
      <div className="flex items-end justify-between h-48 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className="w-8 bg-blue-500 rounded-t"
              style={{ height: `${(item.value / maxValue) * height}px` }}
            ></div>
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-2 transform -rotate-45">
              {item.month}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const generatePieChart = (data: any[]) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    
    return (
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${percentage} ${100 - percentage}`;
              const rotation = currentAngle;
              currentAngle += percentage * 3.6;
              
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.color.replace('bg-', '').replace('-500', '')}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset="25"
                  transform={`rotate(${rotation} 50 50)`}
                  className="opacity-80"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">100%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Charts & Graphs</h2>
            <p className="text-gray-600 dark:text-gray-400">Interactive data visualization components</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Export Charts
            </button>
            <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {chartTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveChart(type.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeChart === type.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{type.icon}</span>
                  <span>{type.name}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Chart Content */}
        <div className="p-6">
          {activeChart === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales Overview</h3>
                {generateBarChart(data.sales)}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Monthly Sales</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">+12.5%</span>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Distribution</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center mb-2">
                        <span className="text-white text-lg font-bold">Chart</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Interactive pie chart</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {data.categories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${category.color} mr-2`}></div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{category.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Traffic Sources */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Traffic Sources</h3>
                <div className="space-y-3">
                  {data.traffic.map((source, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{source.source}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{source.visitors.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${source.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Data */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Real-time Metrics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active Users</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">1,234</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Page Views</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">45,678</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Bounce Rate</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">34.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Session Duration</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">2:45</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeChart === 'line' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Line Chart Example</h3>
                <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📈</div>
                    <p className="text-gray-500 dark:text-gray-400">Interactive line chart would be rendered here</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Using ApexCharts or Chart.js</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeChart === 'bar' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bar Chart Example</h3>
                {generateBarChart(data.sales)}
              </div>
            </div>
          )}

          {activeChart === 'pie' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pie Chart Example</h3>
                <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🥧</div>
                    <p className="text-gray-500 dark:text-gray-400">Interactive pie chart would be rendered here</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Using ApexCharts or Chart.js</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeChart === 'area' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Area Chart Example</h3>
                <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📉</div>
                    <p className="text-gray-500 dark:text-gray-400">Interactive area chart would be rendered here</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Using ApexCharts or Chart.js</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeChart === 'scatter' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Scatter Plot Example</h3>
                <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">⭐</div>
                    <p className="text-gray-500 dark:text-gray-400">Interactive scatter plot would be rendered here</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Using ApexCharts or Chart.js</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chart Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chart Type</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="area">Area Chart</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Range</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Source</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
              <option value="sales">Sales Data</option>
              <option value="traffic">Traffic Data</option>
              <option value="users">User Data</option>
              <option value="revenue">Revenue Data</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts;
