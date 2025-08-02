import { authAPI } from './api';

// Authentication types
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'moderator';
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  success: boolean;
  user?: AdminUser;
  token?: string;
  error?: string;
}

// Authentication service
export const authService = {
  // Sign in
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // Try API first
      try {
        const response = await authAPI.login(email, password);
        
        if (!response.success) {
          return {
            success: false,
            error: response.message || 'Login failed'
          };
        }

        const { token, admin } = response;
        
        // Store token and user in localStorage
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(admin));

        return {
          success: true,
          user: admin,
          token
        };
      } catch (apiError) {
        console.warn('API login failed, trying fallback authentication:', apiError);
        
        // Fallback authentication for development
        if (email === 'admin@admin.com' && password === 'admin') {
          const mockUser: AdminUser = {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@admin.com',
            role: 'super-admin',
            avatar: undefined, // Use initials instead of image path
            isActive: true,
            lastLogin: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const mockToken = 'mock-jwt-token-' + Date.now();
          
          // Store in localStorage
          localStorage.setItem('admin_token', mockToken);
          localStorage.setItem('admin_user', JSON.stringify(mockUser));
          
          return {
            success: true,
            user: mockUser,
            token: mockToken
          };
        }
        
        return {
          success: false,
          error: 'Backend server not available. Use admin@admin.com / admin for development mode.'
        };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during sign in'
      };
    }
  },

  // Sign out
  signOut(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },

  // Get current user
  getCurrentUser(): AdminUser | null {
    try {
      const userStr = localStorage.getItem('admin_user');
      if (!userStr) return null;
      
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Get current token
  getCurrentToken(): string | null {
    return localStorage.getItem('admin_token');
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getCurrentToken();
    const user = this.getCurrentUser();
    
    return !!(token && user);
  },

  // Update user profile
  async updateProfile(updates: Partial<AdminUser>): Promise<AuthResult> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'No user logged in'
        };
      }

      const response = await authAPI.updateProfile(updates);
      
      if (!response.success) {
        return {
          success: false,
          error: response.message || 'Update failed'
        };
      }

      const updatedUser = response.admin;
      
      // Update stored user data
      localStorage.setItem('admin_user', JSON.stringify(updatedUser));

      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred while updating profile'
      };
    }
  }
};

// Initialize authentication on app start
export const initializeAuth = async (): Promise<void> => {
  try {
    // Seed default admin user
    await authAPI.seedAdmin();
  } catch (error) {
    console.error('Failed to initialize authentication:', error);
  }
};
