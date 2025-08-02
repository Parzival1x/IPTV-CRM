import { useState } from 'react';

const UIElements = () => {
  const [activeTab, setActiveTab] = useState('components');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);

  const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'indigo', 'gray'];

  const showToast = () => {
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">UI Elements</h2>
            <p className="text-gray-600 dark:text-gray-400">Complete library of reusable UI components</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Copy Code
            </button>
            <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              Documentation
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {['components', 'forms', 'navigation', 'feedback', 'layout'].map((tab) => (
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

        {/* Components Tab */}
        {activeTab === 'components' && (
          <div className="p-6 space-y-8">
            {/* Buttons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Buttons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Primary Buttons</h4>
                  <div className="flex flex-wrap gap-2">
                    {['sm', 'md', 'lg', 'xl'].map((size) => (
                      <button
                        key={size}
                        className={`bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-lg ${
                          size === 'sm' ? 'px-3 py-1.5 text-sm' :
                          size === 'md' ? 'px-4 py-2 text-sm' :
                          size === 'lg' ? 'px-6 py-3 text-base' :
                          'px-8 py-4 text-lg'
                        }`}
                      >
                        {size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Color Variants</h4>
                  <div className="flex flex-wrap gap-2">
                    {colors.slice(0, 4).map((color) => (
                      <button
                        key={color}
                        className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                          color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                          color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                          color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                          color === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' :
                          color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                          color === 'pink' ? 'bg-pink-600 hover:bg-pink-700' :
                          color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
                          'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Badges</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status Badges</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Active
                    </span>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                      Pending
                    </span>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      Inactive
                    </span>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      New
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Count Badges</h4>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center">
                      <span className="text-gray-700 dark:text-gray-300">Messages</span>
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                        3
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-700 dark:text-gray-300">Notifications</span>
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                        12
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Basic Card</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This is a basic card with some content.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      A
                    </div>
                    <div className="ml-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Card with Avatar</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Subtitle</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Card with avatar and subtitle.</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-4 text-white">
                  <h4 className="font-semibold mb-2">Gradient Card</h4>
                  <p className="text-sm opacity-90">This card has a beautiful gradient background.</p>
                </div>
              </div>
            </div>

            {/* Avatars */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Avatars</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sizes</h4>
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm">
                      👤
                    </div>
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-base">
                      👤
                    </div>
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-lg">
                      👤
                    </div>
                    <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-2xl">
                      👤
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">With Status</h4>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-lg">
                        👤
                      </div>
                      <div className="absolute -bottom-0 -right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    </div>
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-lg">
                        👤
                      </div>
                      <div className="absolute -bottom-0 -right-0 w-4 h-4 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forms Tab */}
        {activeTab === 'forms' && (
          <div className="p-6 space-y-8">
            {/* Input Fields */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Input Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Input
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter text here"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Input with Icon
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Search..."
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Select Dropdowns */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Dropdowns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Basic Select
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                    <option>Select an option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Multiple Select
                  </label>
                  <select multiple className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                    <option>Option 4</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Checkboxes and Radios */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Checkboxes & Radio Buttons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Checkboxes</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Option 1</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Option 2 (checked)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" disabled />
                      <span className="ml-2 text-sm text-gray-400">Option 3 (disabled)</span>
                    </label>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Radio Buttons</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="radio" name="radio-group" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Option A</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="radio-group" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Option B (selected)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="radio-group" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" disabled />
                      <span className="ml-2 text-sm text-gray-400">Option C (disabled)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Switches */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Toggle Switches</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable notifications</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Get notified when something happens</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors">
                    <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white transition-transform"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-save</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Automatically save your work</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
                    <span className="inline-block h-4 w-4 transform translate-x-1 rounded-full bg-white transition-transform"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tab */}
        {activeTab === 'navigation' && (
          <div className="p-6 space-y-8">
            {/* Breadcrumbs */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Breadcrumbs</h3>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white">
                      Home
                    </a>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                      </svg>
                      <a href="#" className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white">
                        Components
                      </a>
                    </div>
                  </li>
                  <li aria-current="page">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                      </svg>
                      <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">UI Elements</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>

            {/* Pagination */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pagination</h3>
              <nav className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Previous
                  </a>
                  <a href="#" className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Next
                  </a>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of{' '}
                      <span className="font-medium">97</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </a>
                      <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        1
                      </a>
                      <a href="#" className="bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                        2
                      </a>
                      <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        3
                      </a>
                      <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </nav>
                  </div>
                </div>
              </nav>
            </div>

            {/* Steps */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Steps</h3>
              <div className="flex items-center">
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <div className="flex items-center justify-center w-8 h-8 border-2 border-blue-600 rounded-full">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <span className="ml-2 text-sm font-medium">Step 1</span>
                </div>
                <div className="flex-1 h-px bg-gray-300 mx-4"></div>
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <div className="flex items-center justify-center w-8 h-8 border-2 border-blue-600 rounded-full bg-blue-600 text-white">
                    <span className="text-sm font-medium">2</span>
                  </div>
                  <span className="ml-2 text-sm font-medium">Step 2</span>
                </div>
                <div className="flex-1 h-px bg-gray-300 mx-4"></div>
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <div className="flex items-center justify-center w-8 h-8 border-2 border-gray-300 rounded-full">
                    <span className="text-sm font-medium">3</span>
                  </div>
                  <span className="ml-2 text-sm font-medium">Step 3</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="p-6 space-y-8">
            {/* Alerts */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alerts</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        This is an informational alert. It provides additional context.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">
                        Success! Your changes have been saved.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        Warning: This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">
                        Error: Something went wrong. Please try again.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modals */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Modals</h3>
              <div className="space-y-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open Modal
                </button>
                <button
                  onClick={showToast}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors ml-4"
                >
                  Show Toast
                </button>
              </div>
            </div>

            {/* Progress Bars */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Bars</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">70%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">90%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Layout Tab */}
        {activeTab === 'layout' && (
          <div className="p-6 space-y-8">
            {/* Grid System */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grid System</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <span className="text-sm text-blue-800 dark:text-blue-400">12 columns</span>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6 bg-green-100 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <span className="text-sm text-green-800 dark:text-green-400">6 columns</span>
                  </div>
                  <div className="col-span-6 bg-green-100 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <span className="text-sm text-green-800 dark:text-green-400">6 columns</span>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4 bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                    <span className="text-sm text-yellow-800 dark:text-yellow-400">4 columns</span>
                  </div>
                  <div className="col-span-4 bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                    <span className="text-sm text-yellow-800 dark:text-yellow-400">4 columns</span>
                  </div>
                  <div className="col-span-4 bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                    <span className="text-sm text-yellow-800 dark:text-yellow-400">4 columns</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Spacing</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded">
                    <span className="text-sm">Padding: 8px</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 p-4 rounded">
                    <span className="text-sm">Padding: 16px</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 p-6 rounded">
                    <span className="text-sm">Padding: 24px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Containers */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Containers</h3>
              <div className="space-y-4">
                <div className="max-w-sm bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Small container (max-width: 384px)</span>
                </div>
                <div className="max-w-md bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Medium container (max-width: 448px)</span>
                </div>
                <div className="max-w-lg bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Large container (max-width: 512px)</span>
                </div>
                <div className="max-w-xl bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Extra large container (max-width: 576px)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sample Modal</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This is a sample modal dialog. You can put any content here.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {isToastVisible && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Toast notification example!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIElements;
