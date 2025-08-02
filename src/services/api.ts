// API service for connecting to the backend
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('admin_token');
};

// Helper function to create headers
const createHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: `HTTP ${response.status}: ${response.statusText}` 
    }));
    
    // Enhanced error messages based on status codes
    let enhancedMessage = error.message || `API request failed with status ${response.status}`;
    
    if (response.status === 0 || !response.status) {
      enhancedMessage = 'Backend server is not running. Please start the backend server first.';
    } else if (response.status === 500) {
      enhancedMessage = `Server error: ${error.message || 'Internal server error occurred'}`;
    } else if (response.status === 400) {
      enhancedMessage = `Bad request: ${error.message || 'Invalid data provided'}`;
    } else if (response.status === 404) {
      enhancedMessage = `Not found: ${error.message || 'The requested resource was not found'}`;
    }
    
    console.error('API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      error: error
    });
    
    throw new Error(enhancedMessage);
  }
  return response.json();
};

// Helper function to handle fetch errors
const handleFetchError = (error: Error) => {
  console.error('Fetch Error:', error);
  
  if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
    throw new Error('❌ Backend server is not accessible. Please start the backend server:\n\n' +
      '1. Open a new terminal\n' +
      '2. Run: cd backend && npm run dev\n' +
      '3. Make sure MongoDB is running\n' +
      '4. Check server is running on http://localhost:3001');
  }
  
  if (error.message.includes('NetworkError')) {
    throw new Error('❌ Network error. Please check your internet connection and server status.');
  }
  
  throw new Error(error.message);
};

// Auth API
export const authAPI = {
  async login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: createHeaders(false),
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error as Error);
    }
  },

  async getProfile() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: createHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error as Error);
    }
  },

  async updateProfile(data: any) {
    const response = await fetch(`${API_BASE_URL}/admin/profile`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async seedAdmin() {
    const response = await fetch(`${API_BASE_URL}/auth/seed`, {
      method: 'POST',
      headers: createHeaders(false),
    });
    return handleResponse(response);
  }
};

// Customers API
export const customersAPI = {
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/customers`, {
        headers: createHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error as Error);
    }
  },

  async getById(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        headers: createHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error as Error);
    }
  },

  async create(data: any) {
    try {
      console.log('🚀 Creating customer with data:', data);
      const response = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(data),
      });
      console.log('📡 Server response status:', response.status);
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Create customer API error:', error);
      handleFetchError(error as Error);
    }
  },

  async update(id: string, data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error as Error);
    }
  },

  async delete(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'DELETE',
        headers: createHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error as Error);
    }
  },

  async seed() {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/seed`, {
        method: 'POST',
        headers: createHeaders(false),
      });
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error as Error);
    }
  }
};

// Health check
export const healthAPI = {
  async check() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return handleResponse(response);
    } catch (error) {
      handleFetchError(error as Error);
    }
  }
};
