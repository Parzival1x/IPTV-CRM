import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      authService
        .validateSession()
        .then(setIsAuthenticated)
        .catch(() => setIsAuthenticated(false));
    };

    checkAuth();
    
    const handleStorageChange = () => {
      checkAuth();
    };

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:changed', handleStorageChange);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:changed', handleStorageChange);
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to signin page, but preserve the intended destination
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
