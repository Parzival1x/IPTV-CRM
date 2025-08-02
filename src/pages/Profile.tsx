import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    bio: 'Full-stack developer with 5+ years of experience in React, Node.js, and cloud technologies.',
    location: 'San Francisco, CA',
    company: 'TechCorp Inc.',
    position: 'Senior Developer',
    website: 'https://johndoe.dev',
    twitter: '@johndoe',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe'
  });

  useEffect(() => {
    // Get user data from authentication service
    const userData = authService.getCurrentUser();
    if (userData) {
      setUser(userData);
      
      // Update profile data with user info
      setProfileData(prev => ({
        ...prev,
        firstName: userData.name?.split(' ')[0] || 'John',
        lastName: userData.name?.split(' ')[1] || 'Doe',
        email: userData.email || 'john.doe@example.com'
      }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
    // Save profile data and update localStorage
    if (user) {
      const updatedUser = {
        ...user,
        name: `${profileData.firstName} ${profileData.lastName}`,
        email: profileData.email
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
    console.log('Profile saved:', profileData);
  };

  const stats = [
    { label: 'Projects', value: '24' },
    { label: 'Followers', value: '1.2K' },
    { label: 'Following', value: '342' },
    { label: 'Repositories', value: '18' }
  ];

  const activities = [
    { type: 'commit', message: 'Fixed authentication bug', time: '2 hours ago', repo: 'admin-dashboard' },
    { type: 'pr', message: 'Added new user management features', time: '1 day ago', repo: 'user-system' },
    { type: 'issue', message: 'Reported performance issue', time: '3 days ago', repo: 'api-server' },
    { type: 'star', message: 'Starred react-table repository', time: '1 week ago', repo: 'react-table' },
    { type: 'fork', message: 'Forked tailwind-components', time: '2 weeks ago', repo: 'tailwind-components' }
  ];

  const projects = [
    { name: 'E-commerce Platform', description: 'Full-stack e-commerce solution', tech: ['React', 'Node.js', 'MongoDB'], status: 'Completed' },
    { name: 'Task Management App', description: 'Productivity app with team collaboration', tech: ['React', 'Firebase', 'TypeScript'], status: 'In Progress' },
    { name: 'Weather Dashboard', description: 'Real-time weather monitoring', tech: ['Vue.js', 'Express', 'PostgreSQL'], status: 'Planning' },
    { name: 'Chat Application', description: 'Real-time messaging platform', tech: ['React', 'Socket.io', 'Redis'], status: 'Completed' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'pr':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'issue':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'star':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'fork':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Planning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg"></div>
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between -mt-16">
            <div className="flex items-center space-x-4">
              <div className="w-32 h-32 bg-white dark:bg-gray-700 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center text-4xl">
                👨‍💼
              </div>
              <div className="pt-16">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profileData.firstName} {profileData.lastName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">{profileData.position} at {profileData.company}</p>
                <p className="text-gray-500 dark:text-gray-500">{profileData.location}</p>
              </div>
            </div>
            <div className="pt-16">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {['profile', 'activity', 'projects', 'settings'].map((tab) => (
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

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="firstName"
                          value={profileData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">{profileData.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="lastName"
                          value={profileData.lastName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">{profileData.lastName}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{profileData.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{profileData.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={profileData.bio}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{profileData.bio}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Social Links</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                    {isEditing ? (
                      <input
                        type="url"
                        name="website"
                        value={profileData.website}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <a href={profileData.website} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {profileData.website}
                      </a>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Twitter</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="twitter"
                        value={profileData.twitter}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{profileData.twitter}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="linkedin"
                        value={profileData.linkedin}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{profileData.linkedin}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="github"
                        value={profileData.github}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{profileData.github}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 flex items-center justify-end space-x-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.repo} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Projects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{project.name}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{project.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <span key={tech} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Privacy Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Make profile public</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Allow others to see your profile</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors">
                      <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white transition-transform"></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Show activity</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Display your recent activities</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
                      <span className="inline-block h-4 w-4 transform translate-x-1 rounded-full bg-white transition-transform"></span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Notification Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email notifications</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors">
                      <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white transition-transform"></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Push notifications</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Receive browser notifications</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
                      <span className="inline-block h-4 w-4 transform translate-x-1 rounded-full bg-white transition-transform"></span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Security</h4>
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    Change Password
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                    Enable Two-Factor Authentication
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                    Download Account Data
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
