import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = authService.getToken();
        const storedUser = authService.getUser();
        
        if (token && storedUser) {
          // Verify token is still valid
          try {
            await authService.verifyToken();
            setUser(storedUser);
            setIsAuthenticated(true);
          } catch (error) {
            // Token is invalid, clear storage
            authService.logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { user: userData, token } = response.data;
      
      authService.setAuthData(token, userData);
      setUser(userData);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authService.signup(userData);
      const { user: newUser, token } = response.data;
      
      authService.setAuthData(token, newUser);
      setUser(newUser);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const isAdmin = () => {
    return user?.role === 'ADMIN';
  };

  const isOwner = () => {
    return user?.role === 'ADMIN';
  };

  const isLibrarian = () => {
    return user?.role === 'LIBRARIAN';
  };

  const canManageBooks = () => {
    return user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isOwner,
    isLibrarian,
    canManageBooks,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};