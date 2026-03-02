import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requireAdmin = false, requireOwner = false, requireAdminOrLibrarian = false }) => {
  const { isAuthenticated, isAdmin, isOwner, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner text="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireOwner && !isAdmin()) {
    // Redirect to home if user is not admin (owner)
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    // Redirect to home if user is not admin
    return <Navigate to="/" replace />;
  }

  if (requireAdminOrLibrarian && !isAdmin() && user?.role !== 'LIBRARIAN') {
    // Redirect to home if user is not admin or librarian
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;